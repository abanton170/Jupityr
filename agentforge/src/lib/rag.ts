import OpenAI from "openai";
import { type Action } from "@prisma/client";
import { prisma } from "@/lib/db";
import { type ApiKeys } from "@/lib/encryption";
import { streamLLM, type LLMMessage } from "@/lib/llm";
import { streamLLMWithActions } from "@/lib/llm-with-actions";

interface ChatOptions {
  agentId: string;
  userMessage: string;
  conversationHistory: { role: "user" | "assistant"; content: string }[];
  apiKeys: ApiKeys;
  agent: {
    systemPrompt: string;
    model: string;
    temperature: number;
    maxTokens: number;
  };
  actions?: Action[];
}

interface RetrievedChunk {
  id: string;
  content: string;
  source_id: string;
  similarity: number;
}

interface RagChatChunk {
  text?: string;
  sources?: string[];
  tokensUsed?: number;
  toolCall?: { actionId: string; params: Record<string, unknown> };
  toolResult?: { actionId: string; result: unknown };
}

async function embedText(
  text: string,
  apiKeys: ApiKeys
): Promise<number[]> {
  if (!apiKeys.openai) {
    throw new Error(
      "OpenAI API key is required for embeddings. Please add your key in Settings."
    );
  }

  const client = new OpenAI({ apiKey: apiKeys.openai });
  const response = await client.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });

  return response.data[0].embedding;
}

export async function* ragChat(options: ChatOptions): AsyncGenerator<RagChatChunk> {
  const { agentId, userMessage, conversationHistory, apiKeys, agent, actions } = options;

  // Step 1: Embed the user query for similarity search
  let chunks: RetrievedChunk[] = [];
  let sourceNames: string[] = [];

  try {
    const queryEmbedding = await embedText(userMessage, apiKeys);
    const embeddingString = `[${queryEmbedding.join(",")}]`;

    // Step 2: Retrieve relevant chunks via pgvector similarity search
    chunks = await prisma.$queryRaw<RetrievedChunk[]>`
      SELECT c.id, c.content, c."sourceId" as source_id,
        1 - (c.embedding <=> ${embeddingString}::vector) as similarity
      FROM "Chunk" c
      WHERE c."agentId" = ${agentId}
        AND c.embedding IS NOT NULL
        AND 1 - (c.embedding <=> ${embeddingString}::vector) > 0.7
      ORDER BY c.embedding <=> ${embeddingString}::vector
      LIMIT 5
    `;

    // Get source names for citations
    if (chunks.length > 0) {
      const sourceIds = [...new Set(chunks.map((c) => c.source_id))];
      const sources = await prisma.dataSource.findMany({
        where: { id: { in: sourceIds } },
        select: { id: true, name: true },
      });
      const sourceMap = new Map(sources.map((s) => [s.id, s.name]));
      sourceNames = [
        ...new Set(
          chunks.map((c) => sourceMap.get(c.source_id) || "Unknown source")
        ),
      ];
    }
  } catch (error) {
    // If embedding or retrieval fails, continue without RAG context
    console.error("RAG retrieval error:", error);
  }

  // Step 3: Build the system prompt with retrieved context
  let systemPrompt: string;

  if (chunks.length > 0) {
    const contextBlock = chunks.map((c) => c.content).join("\n\n---\n\n");
    systemPrompt = `${agent.systemPrompt}

Use the following context to answer the user's question. If the context doesn't contain relevant information, say you don't have enough information to answer that question accurately. Never make up information.

CONTEXT:
---
${contextBlock}
---

Answer the user's question based on the above context. Be helpful, accurate, and concise.`;
  } else {
    systemPrompt = `${agent.systemPrompt}

Note: No relevant context was found in the knowledge base for this query. Answer based on your general knowledge, but let the user know if you're unsure about specific details that might be in the knowledge base.`;
  }

  // Step 4: Build full message array
  const messages: LLMMessage[] = [
    { role: "system", content: systemPrompt },
    ...conversationHistory.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user" as const, content: userMessage },
  ];

  // Step 5: Stream LLM response (with or without actions)
  let totalTokensUsed: number | undefined;

  if (actions && actions.length > 0) {
    // Use the actions-aware LLM wrapper
    for await (const chunk of streamLLMWithActions(
      agent.model,
      messages,
      apiKeys,
      actions,
      {
        temperature: agent.temperature,
        maxTokens: agent.maxTokens,
      }
    )) {
      if (chunk.text) {
        yield { text: chunk.text };
      }
      if (chunk.toolCall) {
        yield { toolCall: chunk.toolCall };
      }
      if (chunk.toolResult) {
        yield { toolResult: chunk.toolResult };
      }
      if (chunk.tokensUsed) {
        totalTokensUsed = chunk.tokensUsed;
      }
    }
  } else {
    // Use the basic LLM streaming (no tools)
    for await (const chunk of streamLLM(agent.model, messages, apiKeys, {
      temperature: agent.temperature,
      maxTokens: agent.maxTokens,
    })) {
      if (chunk.text) {
        yield { text: chunk.text };
      }
      if (chunk.tokensUsed) {
        totalTokensUsed = chunk.tokensUsed;
      }
    }
  }

  // Step 6: Yield sources and token usage at the end
  if (sourceNames.length > 0) {
    yield { sources: sourceNames };
  }

  if (totalTokensUsed) {
    yield { tokensUsed: totalTokensUsed };
  }
}
