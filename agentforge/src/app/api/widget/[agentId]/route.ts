import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { decryptApiKeys } from "@/lib/encryption";

// Simple in-memory rate limiter
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 30;
const RATE_WINDOW = 60 * 1000; // 1 minute

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW });
    return true;
  }

  if (entry.count >= RATE_LIMIT) {
    return false;
  }

  entry.count++;
  return true;
}

// GET: Return agent config (public, no auth)
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const { agentId } = await params;

    const agent = await prisma.agent.findUnique({
      where: { id: agentId, isActive: true },
      select: {
        name: true,
        primaryColor: true,
        position: true,
        welcomeMessage: true,
        suggestedQuestions: true,
        avatarUrl: true,
      },
    });

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    return NextResponse.json(agent, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Cache-Control": "public, max-age=60",
      },
    });
  } catch (error) {
    console.error("Widget config error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST: Chat endpoint for widget (rate limited, no auth)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";

    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please try again later." },
        { status: 429 }
      );
    }

    const { agentId } = await params;

    const body = await request.json();
    const { message, sessionId } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    const agent = await prisma.agent.findUnique({
      where: { id: agentId, isActive: true },
      include: { user: { select: { encryptedApiKeys: true } } },
    });

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    if (!agent.user.encryptedApiKeys) {
      return NextResponse.json(
        { error: "Agent is not configured" },
        { status: 503 }
      );
    }

    let apiKeys;
    try {
      apiKeys = decryptApiKeys(agent.user.encryptedApiKeys);
    } catch {
      return NextResponse.json(
        { error: "Agent configuration error" },
        { status: 503 }
      );
    }

    // Get or create conversation
    const conversationSessionId = sessionId || `widget_${Date.now()}`;
    let conversation = await prisma.conversation.findFirst({
      where: { agentId, sessionId: conversationSessionId },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
          take: 20,
        },
      },
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          agentId,
          sessionId: conversationSessionId,
          channel: "web",
        },
        include: { messages: true },
      });
    }

    // Save user message
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: "USER",
        content: message,
      },
    });

    // Build conversation history
    const history = conversation.messages.map((m) => ({
      role: m.role.toLowerCase() as "user" | "assistant",
      content: m.content,
    }));

    // Try to import and use RAG
    let ragModule: typeof import("@/lib/rag") | undefined;
    try {
      ragModule = await import("@/lib/rag");
    } catch {
      // RAG module not available yet
    }

    const encoder = new TextEncoder();
    let fullResponse = "";

    const stream = new ReadableStream({
      async start(controller) {
        try {
          if (ragModule) {
            const chatStream = ragModule.ragChat({
              agentId,
              userMessage: message,
              conversationHistory: history,
              apiKeys,
              agent: {
                systemPrompt: agent.systemPrompt,
                model: agent.model,
                temperature: agent.temperature,
                maxTokens: agent.maxTokens,
              },
            });

            for await (const chunk of chatStream) {
              if (chunk.text) {
                fullResponse += chunk.text;
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({ text: chunk.text })}\n\n`
                  )
                );
              }
            }
          } else {
            // Fallback: direct LLM call without RAG
            let llmModule;
            try {
              llmModule = await import("@/lib/llm");
            } catch {
              const errorMsg = "Chat engine is not configured yet.";
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ text: errorMsg })}\n\n`
                )
              );
              fullResponse = errorMsg;
              controller.enqueue(encoder.encode("data: [DONE]\n\n"));
              controller.close();
              return;
            }

            const messages = [
              { role: "system" as const, content: agent.systemPrompt },
              ...history,
              { role: "user" as const, content: message },
            ];

            const llmStream = llmModule.streamLLM(
              agent.model,
              messages,
              apiKeys,
              {
                temperature: agent.temperature,
                maxTokens: agent.maxTokens,
              }
            );

            for await (const chunk of llmStream) {
              if (chunk.text) {
                fullResponse += chunk.text;
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({ text: chunk.text })}\n\n`
                  )
                );
              }
            }
          }
        } catch (err) {
          console.error("Widget chat error:", err);
          const errorMsg = "Sorry, I encountered an error. Please try again.";
          if (!fullResponse) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ text: errorMsg })}\n\n`
              )
            );
            fullResponse = errorMsg;
          }
        }

        // Save assistant message
        if (fullResponse) {
          await prisma.message.create({
            data: {
              conversationId: conversation!.id,
              role: "ASSISTANT",
              content: fullResponse,
              model: agent.model,
            },
          });
        }

        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  } catch (error) {
    console.error("Widget chat error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Handle CORS preflight
export async function OPTIONS() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
