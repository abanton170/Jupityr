import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { agentCreateSchema } from "@/lib/validations";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const agents = await prisma.agent.findMany({
      where: { userId: session.user.id },
      orderBy: { updatedAt: "desc" },
      include: {
        _count: {
          select: {
            conversations: true,
            dataSources: true,
            leads: true,
          },
        },
      },
    });

    return NextResponse.json(agents);
  } catch (error) {
    console.error("Agents list error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = agentCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const agent = await prisma.agent.create({
      data: {
        userId: session.user.id,
        name: parsed.data.name,
        description: parsed.data.description,
        systemPrompt: parsed.data.systemPrompt,
        model: parsed.data.model,
        temperature: parsed.data.temperature,
        maxTokens: parsed.data.maxTokens,
        welcomeMessage: parsed.data.welcomeMessage,
        suggestedQuestions: parsed.data.suggestedQuestions ?? [],
        primaryColor: parsed.data.primaryColor,
        position: parsed.data.position,
      },
    });

    return NextResponse.json(agent, { status: 201 });
  } catch (error) {
    console.error("Agent create error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
