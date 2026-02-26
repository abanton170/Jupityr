import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { agentCreateSchema } from "@/lib/validations";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { agentId } = await params;

    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      include: {
        _count: {
          select: {
            dataSources: true,
            conversations: true,
            leads: true,
          },
        },
      },
    });

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    if (agent.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(agent);
  } catch (error) {
    console.error("Agent get error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { agentId } = await params;

    const existingAgent = await prisma.agent.findUnique({
      where: { id: agentId },
    });

    if (!existingAgent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    if (existingAgent.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = agentCreateSchema.partial().safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const agent = await prisma.agent.update({
      where: { id: agentId },
      data: {
        ...(parsed.data.name !== undefined && { name: parsed.data.name }),
        ...(parsed.data.description !== undefined && {
          description: parsed.data.description,
        }),
        ...(parsed.data.systemPrompt !== undefined && {
          systemPrompt: parsed.data.systemPrompt,
        }),
        ...(parsed.data.model !== undefined && { model: parsed.data.model }),
        ...(parsed.data.temperature !== undefined && {
          temperature: parsed.data.temperature,
        }),
        ...(parsed.data.maxTokens !== undefined && {
          maxTokens: parsed.data.maxTokens,
        }),
        ...(parsed.data.welcomeMessage !== undefined && {
          welcomeMessage: parsed.data.welcomeMessage,
        }),
        ...(parsed.data.suggestedQuestions !== undefined && {
          suggestedQuestions: parsed.data.suggestedQuestions,
        }),
        ...(parsed.data.primaryColor !== undefined && {
          primaryColor: parsed.data.primaryColor,
        }),
        ...(parsed.data.position !== undefined && {
          position: parsed.data.position,
        }),
      },
    });

    return NextResponse.json(agent);
  } catch (error) {
    console.error("Agent update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { agentId } = await params;

    const existingAgent = await prisma.agent.findUnique({
      where: { id: agentId },
    });

    if (!existingAgent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    if (existingAgent.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.agent.delete({
      where: { id: agentId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Agent delete error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
