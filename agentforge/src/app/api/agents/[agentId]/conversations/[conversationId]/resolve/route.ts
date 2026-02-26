import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(
  _request: Request,
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
      select: { agentId: true, isResolved: true },
    });

    if (!conversation || conversation.agentId !== agentId) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    // Toggle resolved status
    const updated = await prisma.conversation.update({
      where: { id: conversationId },
      data: { isResolved: !conversation.isResolved },
    });

    return NextResponse.json({ isResolved: updated.isResolved });
  } catch (error) {
    console.error("Resolve error:", error);
    return NextResponse.json(
      { error: "Failed to update conversation" },
      { status: 500 }
    );
  }
}
