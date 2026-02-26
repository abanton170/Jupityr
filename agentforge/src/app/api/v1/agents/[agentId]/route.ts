import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authenticateApiRequest, isApiError } from "@/lib/api-auth";
import { apiRateLimit } from "@/lib/rate-limit";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const authResult = await authenticateApiRequest();
    if (isApiError(authResult)) return authResult;

    const rateLimitResult = apiRateLimit(authResult.userId);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Try again later." },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": String(rateLimitResult.limit),
            "X-RateLimit-Remaining": String(rateLimitResult.remaining),
            "X-RateLimit-Reset": String(rateLimitResult.resetMs),
          },
        }
      );
    }

    const { agentId } = await params;

    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      select: {
        id: true,
        name: true,
        description: true,
        systemPrompt: true,
        model: true,
        temperature: true,
        maxTokens: true,
        welcomeMessage: true,
        suggestedQuestions: true,
        primaryColor: true,
        position: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            conversations: true,
            dataSources: true,
            leads: true,
          },
        },
      },
    });

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    // Verify ownership — we need to check userId separately since it's not in the select
    const agentOwner = await prisma.agent.findUnique({
      where: { id: agentId },
      select: { userId: true },
    });

    if (agentOwner?.userId !== authResult.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ data: agent });
  } catch (error) {
    console.error("v1 agent get error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
