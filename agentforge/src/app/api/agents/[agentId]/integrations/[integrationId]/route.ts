import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { encrypt } from "@/lib/encryption";

const integrationUpdateSchema = z.object({
  config: z.record(z.string(), z.unknown()).optional(),
  credentials: z.record(z.string(), z.string()).optional(),
  isActive: z.boolean().optional(),
});

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ agentId: string; integrationId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { agentId, integrationId } = await params;

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

    // Verify integration belongs to this agent
    const existing = await prisma.integration.findUnique({
      where: { id: integrationId },
    });

    if (!existing || existing.agentId !== agentId) {
      return NextResponse.json(
        { error: "Integration not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const parsed = integrationUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Build update data
    const updateData: Record<string, unknown> = {};

    if (parsed.data.config !== undefined) {
      updateData.config = parsed.data.config;
    }

    if (parsed.data.isActive !== undefined) {
      updateData.isActive = parsed.data.isActive;
    }

    if (parsed.data.credentials !== undefined) {
      updateData.encryptedCredentials =
        Object.keys(parsed.data.credentials).length > 0
          ? encrypt(JSON.stringify(parsed.data.credentials))
          : null;
    }

    const integration = await prisma.integration.update({
      where: { id: integrationId },
      data: updateData,
      select: {
        id: true,
        platform: true,
        config: true,
        isActive: true,
        createdAt: true,
      },
    });

    return NextResponse.json(integration);
  } catch (error) {
    console.error("Integration update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ agentId: string; integrationId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { agentId, integrationId } = await params;

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

    // Verify integration belongs to this agent
    const existing = await prisma.integration.findUnique({
      where: { id: integrationId },
    });

    if (!existing || existing.agentId !== agentId) {
      return NextResponse.json(
        { error: "Integration not found" },
        { status: 404 }
      );
    }

    await prisma.integration.delete({
      where: { id: integrationId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Integration delete error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
