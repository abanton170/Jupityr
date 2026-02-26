import { requireAuth } from "@/lib/auth-utils";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Zap, Plus } from "lucide-react";
import { ActionList } from "@/components/action-list";

export default async function ActionsPage({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  const user = await requireAuth();
  const { agentId } = await params;

  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    include: {
      actions: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!agent || agent.userId !== user.id) {
    notFound();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link
            href={`/agents/${agentId}`}
            className="inline-flex items-center justify-center rounded-md border p-2 hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Actions</h1>
            <p className="text-sm text-muted-foreground">
              Configure AI-powered actions for {agent.name}
            </p>
          </div>
        </div>
        <Link
          href={`/agents/${agentId}/actions/new`}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Action
        </Link>
      </div>

      {/* Action List */}
      {agent.actions.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center">
          <Zap className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">No actions yet</h3>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
            Actions let your agent perform tasks like calling APIs, collecting
            leads, sending notifications, and more.
          </p>
          <Link
            href={`/agents/${agentId}/actions/new`}
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Create Your First Action
          </Link>
        </div>
      ) : (
        <ActionList
          agentId={agentId}
          actions={agent.actions.map((action) => ({
            id: action.id,
            name: action.name,
            description: action.description,
            type: action.type,
            isActive: action.isActive,
            createdAt: action.createdAt.toISOString(),
          }))}
        />
      )}
    </div>
  );
}
