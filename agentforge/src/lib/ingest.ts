import { prisma } from "@/lib/db";
import { chunkText } from "@/lib/chunker";
import { embedTexts } from "@/lib/embeddings";
import { decryptApiKeys } from "@/lib/encryption";
import { Prisma } from "@prisma/client";

const EMBEDDING_BATCH_SIZE = 50;

/**
 * Ingest a data source: chunk its raw content, generate embeddings,
 * and store everything in the database.
 */
export async function ingestDataSource(
  sourceId: string,
  userId: string
): Promise<void> {
  // Mark as processing
  await prisma.dataSource.update({
    where: { id: sourceId },
    data: { status: "PROCESSING" },
  });

  try {
    // Load the DataSource
    const source = await prisma.dataSource.findUnique({
      where: { id: sourceId },
    });

    if (!source) {
      throw new Error(`DataSource not found: ${sourceId}`);
    }

    if (!source.rawContent) {
      throw new Error(`DataSource has no raw content: ${sourceId}`);
    }

    // Get the user's OpenAI API key
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { encryptedApiKeys: true },
    });

    if (!user?.encryptedApiKeys) {
      throw new Error("User has no API keys configured");
    }

    const apiKeys = decryptApiKeys(user.encryptedApiKeys);
    if (!apiKeys.openai) {
      throw new Error("User has no OpenAI API key configured");
    }

    // Chunk the raw content
    const chunks = chunkText(source.rawContent);

    if (chunks.length === 0) {
      await prisma.dataSource.update({
        where: { id: sourceId },
        data: {
          status: "COMPLETED",
          chunkCount: 0,
        },
      });
      return;
    }

    // Create chunk records in the database (without embeddings first)
    const createdChunks = await Promise.all(
      chunks.map((chunk) =>
        prisma.chunk.create({
          data: {
            agentId: source.agentId,
            sourceId: source.id,
            content: chunk.content,
            tokenCount: chunk.tokenCount,
            position: chunk.position,
          },
        })
      )
    );

    // Generate embeddings in batches and update chunk records
    for (let i = 0; i < createdChunks.length; i += EMBEDDING_BATCH_SIZE) {
      const batchChunks = createdChunks.slice(i, i + EMBEDDING_BATCH_SIZE);
      const batchTexts = batchChunks.map((c) => c.content);

      const embeddings = await embedTexts(batchTexts, apiKeys.openai);

      // Update each chunk with its embedding using raw SQL for pgvector
      for (let j = 0; j < batchChunks.length; j++) {
        const chunkId = batchChunks[j].id;
        const vector = `[${embeddings[j].join(",")}]`;

        await prisma.$executeRaw`
          UPDATE "Chunk"
          SET embedding = ${vector}::vector
          WHERE id = ${chunkId}
        `;
      }
    }

    // Update DataSource status
    await prisma.dataSource.update({
      where: { id: sourceId },
      data: {
        status: "COMPLETED",
        chunkCount: createdChunks.length,
      },
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error during ingestion";

    await prisma.dataSource.update({
      where: { id: sourceId },
      data: {
        status: "FAILED",
        errorMsg: errorMessage,
      },
    });

    throw error;
  }
}
