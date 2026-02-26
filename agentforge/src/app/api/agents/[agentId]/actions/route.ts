import { NextRequest, NextResponse } from "next/server";
import { type Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { actionCreateSchema } from "@/lib/validations";

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
 * GET /api/agents/[agentId]/actions
 * List all actions for the specified agent.
 */
export async function GET(
  _request: NextRequest,
  { params }: RouteParams
) {
  const { agentId } = await params;
  const result = await verifyOwnership(agentId);
  if (result instanceof NextResponse) return result;

  const actions = await prisma.action.findMany({
    where: { agentId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ actions });
}

/**
 * POST /api/agents/[agentId]/actions
 * Create a new action for the specified agent.
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  const { agentId } = await params;
  const result = await verifyOwnership(agentId);
  if (result instanceof NextResponse) return result;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const parsed = actionCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const action = await prisma.action.create({
    data: {
      agentId,
      name: parsed.data.name,
      description: parsed.data.description,
      type: parsed.data.type,
      endpointUrl: parsed.data.endpointUrl ?? null,
      httpMethod: parsed.data.httpMethod ?? "POST",
      headers: (parsed.data.headers as Prisma.InputJsonValue) ?? undefined,
      paramsSchema:
        (parsed.data.paramsSchema as Prisma.InputJsonValue) ?? undefined,
      config: (parsed.data.config as Prisma.InputJsonValue) ?? undefined,
      isActive: parsed.data.isActive ?? true,
    },
  });

  return NextResponse.json({ action }, { status: 201 });
}
