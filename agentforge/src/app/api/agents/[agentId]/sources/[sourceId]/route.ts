import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

interface RouteParams {
  params: Promise<{ agentId: string; sourceId: string }>;
}

/**
 * DELETE /api/agents/[agentId]/sources/[sourceId]
 * Delete a data source and all its associated chunks.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: RouteParams
) {
  const { agentId, sourceId } = await params;

  // Authenticate
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

  // Verify the data source belongs to this agent
  const source = await prisma.dataSource.findUnique({
    where: { id: sourceId },
    select: { id: true, agentId: true },
  });

  if (!source) {
    return NextResponse.json(
      { error: "Data source not found" },
      { status: 404 }
    );
  }

  if (source.agentId !== agentId) {
    return NextResponse.json(
      { error: "Data source does not belong to this agent" },
      { status: 403 }
    );
  }

  // Delete the data source (chunks are cascade-deleted via the schema)
  await prisma.dataSource.delete({
    where: { id: sourceId },
  });

  return NextResponse.json({ success: true });
}
