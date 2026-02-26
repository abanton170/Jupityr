import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parseFile } from "@/lib/file-parser";
import { crawlUrl } from "@/lib/crawler";
import { chunkText } from "@/lib/chunker";

interface RouteParams {
  params: Promise<{ agentId: string }>;
}

/**
 * Verify that the authenticated user owns the specified agent.
 * Returns the user ID on success, or a NextResponse error on failure.
 */
async function verifyOwnership(
  agentId: string
): Promise<{ userId: string } | NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    select: { userId: true },
  });

  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  if (agent.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return { userId: session.user.id };
}

/**
 * Create chunk records directly from text content.
 */
async function createChunks(
  sourceId: string,
  agentId: string,
  content: string
): Promise<number> {
  const chunks = chunkText(content);

  if (chunks.length === 0) return 0;

  await prisma.chunk.createMany({
    data: chunks.map((chunk) => ({
      agentId,
      sourceId,
      content: chunk.content,
      tokenCount: chunk.tokenCount,
      position: chunk.position,
    })),
  });

  return chunks.length;
}

/**
 * GET /api/agents/[agentId]/sources
 * List all data sources for the specified agent.
 */
export async function GET(
  _request: NextRequest,
  { params }: RouteParams
) {
  const { agentId } = await params;
  const result = await verifyOwnership(agentId);
  if (result instanceof NextResponse) return result;

  const sources = await prisma.dataSource.findMany({
    where: { agentId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      type: true,
      name: true,
      sourceUrl: true,
      charCount: true,
      chunkCount: true,
      status: true,
      errorMsg: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ sources });
}

/**
 * POST /api/agents/[agentId]/sources
 * Create a new data source. Accepts:
 *   - multipart/form-data with a "file" field (file upload)
 *   - JSON body with { url } (URL submission)
 *   - JSON body with { text, name } (text input)
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  const { agentId } = await params;
  const result = await verifyOwnership(agentId);
  if (result instanceof NextResponse) return result;
  const { userId } = result;

  const contentType = request.headers.get("content-type") || "";

  // --- File Upload ---
  if (contentType.includes("multipart/form-data")) {
    return handleFileUpload(request, agentId);
  }

  // --- JSON body: URL or Text ---
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  if (typeof body.url === "string" && body.url.trim()) {
    return handleUrlSubmission(body.url.trim(), agentId);
  }

  if (typeof body.text === "string" && body.text.trim()) {
    const name =
      typeof body.name === "string" && body.name.trim()
        ? body.name.trim()
        : "Text Input";
    return handleTextInput(body.text.trim(), name, agentId);
  }

  return NextResponse.json(
    { error: "Request must include a file, url, or text field" },
    { status: 400 }
  );
}

/**
 * Handle file upload via multipart/form-data.
 */
async function handleFileUpload(
  request: NextRequest,
  agentId: string
): Promise<NextResponse> {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Failed to parse form data" },
      { status: 400 }
    );
  }

  const file = formData.get("file");
  if (!file || !(file instanceof Blob)) {
    return NextResponse.json(
      { error: "No file provided" },
      { status: 400 }
    );
  }

  const filename =
    file instanceof File ? file.name : "uploaded-file";

  let content: string;
  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    content = await parseFile(buffer, filename);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to parse file";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const source = await prisma.dataSource.create({
    data: {
      agentId,
      type: "FILE",
      name: filename,
      rawContent: content,
      charCount: content.length,
      status: "PENDING",
    },
  });

  // Create chunks directly
  const chunkCount = await createChunks(source.id, agentId, content);
  await prisma.dataSource.update({
    where: { id: source.id },
    data: { chunkCount },
  });

  return NextResponse.json({ source: { ...source, chunkCount } }, { status: 201 });
}

/**
 * Handle URL submission.
 */
async function handleUrlSubmission(
  url: string,
  agentId: string
): Promise<NextResponse> {
  // Validate URL
  try {
    new URL(url);
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  // Create DataSource with PENDING status
  const source = await prisma.dataSource.create({
    data: {
      agentId,
      type: "URL",
      name: url,
      sourceUrl: url,
      status: "PENDING",
    },
  });

  // Crawl the URL and store content
  try {
    const pages = await crawlUrl(url, { maxDepth: 2, maxPages: 20 });

    if (pages.length === 0) {
      await prisma.dataSource.update({
        where: { id: source.id },
        data: {
          status: "FAILED",
          errorMsg: "No content could be extracted from the URL",
        },
      });
      return NextResponse.json(
        { source, error: "No content could be extracted from the URL" },
        { status: 200 }
      );
    }

    // Combine all page content
    const combinedContent = pages
      .map((page) => `# ${page.title}\nSource: ${page.url}\n\n${page.content}`)
      .join("\n\n---\n\n");

    // Update the data source with the crawled content
    await prisma.dataSource.update({
      where: { id: source.id },
      data: {
        name: pages[0].title || url,
        rawContent: combinedContent,
        charCount: combinedContent.length,
      },
    });

    // Create chunks directly
    const chunkCount = await createChunks(source.id, agentId, combinedContent);
    await prisma.dataSource.update({
      where: { id: source.id },
      data: { chunkCount },
    });

    const updatedSource = await prisma.dataSource.findUnique({
      where: { id: source.id },
    });

    return NextResponse.json(
      { source: updatedSource, pagesFound: pages.length },
      { status: 201 }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Crawling failed";
    await prisma.dataSource.update({
      where: { id: source.id },
      data: {
        status: "FAILED",
        errorMsg: message,
      },
    });
    return NextResponse.json(
      { source, error: message },
      { status: 500 }
    );
  }
}

/**
 * Handle direct text input.
 */
async function handleTextInput(
  text: string,
  name: string,
  agentId: string
): Promise<NextResponse> {
  const source = await prisma.dataSource.create({
    data: {
      agentId,
      type: "TEXT",
      name,
      rawContent: text,
      charCount: text.length,
      status: "PENDING",
    },
  });

  // Create chunks directly
  const chunkCount = await createChunks(source.id, agentId, text);
  await prisma.dataSource.update({
    where: { id: source.id },
    data: { chunkCount },
  });

  return NextResponse.json({ source: { ...source, chunkCount } }, { status: 201 });
}
