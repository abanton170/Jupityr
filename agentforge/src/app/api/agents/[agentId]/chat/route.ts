import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { decryptApiKeys } from "@/lib/encryption";
import { ragChat } from "@/lib/rag";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    // 1. Authenticate user
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { agentId } = await params;

    // 2. Parse request body
    const body = await request.json();
    const { message, conversationId, sessionId } = body as {
      message?: string;
      conversationId?: string;
      sessionId?: string;
    };

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    // 3. Load agent and verify ownership
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
    });

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    if (agent.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 4. Get user's API keys
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { encryptedApiKeys: true },
    });

    if (!user?.encryptedApiKeys) {
      return NextResponse.json(
        { error: "API keys not configured. Please add your keys in Settings." },
        { status: 400 }
      );
    }

    const apiKeys = decryptApiKeys(user.encryptedApiKeys);

    // 5. Get or create conversation
    let conversation;
    if (conversationId) {
      conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
        include: {
          messages: {
            orderBy: { createdAt: "asc" },
            select: { role: true, content: true },
          },
        },
      });

      if (!conversation || conversation.agentId !== agentId) {
        return NextResponse.json(
          { error: "Conversation not found" },
          { status: 404 }
        );
      }
    } else {
      conversation = await prisma.conversation.create({
        data: {
          agentId,
          sessionId: sessionId || crypto.randomUUID(),
          channel: "web",
        },
        include: {
          messages: {
            orderBy: { createdAt: "asc" },
            select: { role: true, content: true },
          },
        },
      });
    }

    // 6. Save user message
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: "USER",
        content: message.trim(),
      },
    });

    // Build conversation history from prior messages
    const conversationHistory = conversation.messages.map((m) => ({
      role: m.role === "USER" ? ("user" as const) : ("assistant" as const),
      content: m.content,
    }));

    // 7. Stream response using ragChat
    const encoder = new TextEncoder();
    let fullResponse = "";
    let sources: string[] = [];
    let tokensUsed: number | undefined;

    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send conversation ID first so client can use it for follow-ups
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ conversationId: conversation.id })}\n\n`
            )
          );

          for await (const chunk of ragChat({
            agentId,
            userMessage: message.trim(),
            conversationHistory,
            apiKeys,
            agent: {
              systemPrompt: agent.systemPrompt,
              model: agent.model,
              temperature: agent.temperature,
              maxTokens: agent.maxTokens,
            },
          })) {
            if (chunk.text) {
              fullResponse += chunk.text;
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ text: chunk.text })}\n\n`
                )
              );
            }
            if (chunk.sources) {
              sources = chunk.sources;
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ sources: chunk.sources })}\n\n`
                )
              );
            }
            if (chunk.tokensUsed) {
              tokensUsed = chunk.tokensUsed;
            }
          }

          // 8. Save assistant message after streaming completes
          await prisma.message.create({
            data: {
              conversationId: conversation.id,
              role: "ASSISTANT",
              content: fullResponse,
              model: agent.model,
              sources,
              tokensUsed: tokensUsed ?? null,
            },
          });

          // Update conversation timestamp
          await prisma.conversation.update({
            where: { id: conversation.id },
            data: { updatedAt: new Date() },
          });

          controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
          controller.close();
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "An unexpected error occurred";
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: errorMessage })}\n\n`
            )
          );
          controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
