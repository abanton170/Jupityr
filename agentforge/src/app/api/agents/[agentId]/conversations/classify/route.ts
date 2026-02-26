import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { decryptApiKeys } from "@/lib/encryption";
import { classifyConversation } from "@/lib/classify";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { agentId } = await params;

    // Verify agent ownership
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      select: { userId: true },
    });

    if (!agent || agent.userId !== session.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await request.json();
    const { conversationId } = body as { conversationId?: string };

    if (!conversationId) {
      return NextResponse.json(
        { error: "conversationId is required" },
        { status: 400 }
      );
    }

    // Verify conversation belongs to this agent
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

    // Get user API keys
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { encryptedApiKeys: true },
    });

    if (!user?.encryptedApiKeys) {
      return NextResponse.json(
        { error: "API keys not configured" },
        { status: 400 }
      );
    }

    const apiKeys = decryptApiKeys(user.encryptedApiKeys);
    const result = await classifyConversation(conversationId, apiKeys);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Classify error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Classification failed" },
      { status: 500 }
    );
  }
}
