import { NextResponse } from "next/server";
import { type Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { encrypt } from "@/lib/encryption";

const integrationCreateSchema = z.object({
  platform: z.enum([
    "SLACK",
    "WHATSAPP",
    "MESSENGER",
    "ZENDESK",
    "STRIPE",
    "ZAPIER",
  ]),
  config: z.record(z.string(), z.unknown()).optional(),
  credentials: z.record(z.string(), z.string()).optional(),
});

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

    // Verify agent ownership
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      select: { userId: true },
    });

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    if (agent.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const integrations = await prisma.integration.findMany({
      where: { agentId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        platform: true,
        config: true,
        isActive: true,
        createdAt: true,
      },
    });

    return NextResponse.json(integrations);
  } catch (error) {
    console.error("Integrations list error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

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

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    if (agent.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = integrationCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Encrypt credentials if provided
    let encryptedCredentials: string | null = null;
    if (parsed.data.credentials && Object.keys(parsed.data.credentials).length > 0) {
      encryptedCredentials = encrypt(JSON.stringify(parsed.data.credentials));
    }

    const integration = await prisma.integration.create({
      data: {
        agentId,
        platform: parsed.data.platform,
        config: parsed.data.config
          ? (JSON.parse(JSON.stringify(parsed.data.config)) as Prisma.InputJsonValue)
          : undefined,
        encryptedCredentials,
      },
      select: {
        id: true,
        platform: true,
        config: true,
        isActive: true,
        createdAt: true,
      },
    });

    return NextResponse.json(integration, { status: 201 });
  } catch (error) {
    console.error("Integration create error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
