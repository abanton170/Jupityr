import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ agentId: string; conversationId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { agentId, conversationId } = await params;

    // Verify agent ownership
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      select: { userId: true },
    });

    if (!agent || agent.userId !== session.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Verify conversation belongs to agent
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { agentId: true },
    });

    if (!conversation || conversation.agentId !== agentId) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { messageId, revisedAnswer } = body as {
      messageId?: string;
      revisedAnswer?: string;
    };

    if (!messageId || !revisedAnswer) {
      return NextResponse.json(
        { error: "messageId and revisedAnswer are required" },
        { status: 400 }
      );
    }

    // Get the original assistant message and the preceding user message
    const originalMessage = await prisma.message.findUnique({
      where: { id: messageId },
      select: {
        id: true,
        content: true,
        conversationId: true,
        role: true,
        createdAt: true,
      },
    });

    if (
      !originalMessage ||
      originalMessage.conversationId !== conversationId ||
      originalMessage.role !== "ASSISTANT"
    ) {
      return NextResponse.json(
        { error: "Assistant message not found" },
        { status: 404 }
      );
    }

    // Find the user message immediately before this assistant message
    const userMessage = await prisma.message.findFirst({
      where: {
        conversationId,
        role: "USER",
        createdAt: { lt: originalMessage.createdAt },
      },
      orderBy: { createdAt: "desc" },
      select: { content: true },
    });

    const question = userMessage?.content ?? "Unknown question";

    // Create a Q&A DataSource with the corrected answer
    await prisma.dataSource.create({
      data: {
        agentId,
        type: "QA",
        name: `Revised: ${question.slice(0, 50)}${question.length > 50 ? "..." : ""}`,
        rawContent: `Q: ${question}\nA: ${revisedAnswer}`,
        charCount: question.length + revisedAnswer.length,
        status: "COMPLETED",
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Revise error:", error);
    return NextResponse.json(
      { error: "Failed to save revised answer" },
      { status: 500 }
    );
  }
}
