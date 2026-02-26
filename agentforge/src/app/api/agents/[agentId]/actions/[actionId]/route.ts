import { NextRequest, NextResponse } from "next/server";
import { type Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { actionCreateSchema } from "@/lib/validations";

interface RouteParams {
  params: Promise<{ agentId: string; actionId: string }>;
}

/**
 * GET /api/agents/[agentId]/actions/[actionId]
 * Get a single action.
 */
export async function GET(
  _request: NextRequest,
  { params }: RouteParams
) {
  const { agentId, actionId } = await params;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

  const action = await prisma.action.findUnique({
    where: { id: actionId },
  });

  if (!action || action.agentId !== agentId) {
    return NextResponse.json({ error: "Action not found" }, { status: 404 });
  }

  return NextResponse.json({ action });
}

/**
 * PUT /api/agents/[agentId]/actions/[actionId]
 * Update an action.
 */
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  const { agentId, actionId } = await params;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

  // Verify the action belongs to this agent
  const existingAction = await prisma.action.findUnique({
    where: { id: actionId },
  });

  if (!existingAction || existingAction.agentId !== agentId) {
    return NextResponse.json({ error: "Action not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const parsed = actionCreateSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const updateData: Prisma.ActionUpdateInput = {};

  if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
  if (parsed.data.description !== undefined)
    updateData.description = parsed.data.description;
  if (parsed.data.type !== undefined) updateData.type = parsed.data.type;
  if (parsed.data.endpointUrl !== undefined)
    updateData.endpointUrl = parsed.data.endpointUrl;
  if (parsed.data.httpMethod !== undefined)
    updateData.httpMethod = parsed.data.httpMethod;
  if (parsed.data.headers !== undefined)
    updateData.headers = parsed.data.headers as Prisma.InputJsonValue;
  if (parsed.data.paramsSchema !== undefined)
    updateData.paramsSchema =
      parsed.data.paramsSchema as Prisma.InputJsonValue;
  if (parsed.data.config !== undefined)
    updateData.config = parsed.data.config as Prisma.InputJsonValue;
  if (parsed.data.isActive !== undefined)
    updateData.isActive = parsed.data.isActive;

  const action = await prisma.action.update({
    where: { id: actionId },
    data: updateData,
  });

  return NextResponse.json({ action });
}

/**
 * DELETE /api/agents/[agentId]/actions/[actionId]
 * Delete an action.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: RouteParams
) {
  const { agentId, actionId } = await params;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

  // Verify the action belongs to this agent
  const existingAction = await prisma.action.findUnique({
    where: { id: actionId },
    select: { id: true, agentId: true },
  });

  if (!existingAction || existingAction.agentId !== agentId) {
    return NextResponse.json({ error: "Action not found" }, { status: 404 });
  }

  await prisma.action.delete({
    where: { id: actionId },
  });

  return NextResponse.json({ success: true });
}
