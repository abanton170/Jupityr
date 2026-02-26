import { requireAuth } from "@/lib/auth-utils";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ActionForm } from "@/components/action-form";

export default async function EditActionPage({
  params,
}: {
  params: Promise<{ agentId: string; actionId: string }>;
}) {
  const user = await requireAuth();
  const { agentId, actionId } = await params;

  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    select: { id: true, userId: true, name: true },
  });

  if (!agent || agent.userId !== user.id) {
    notFound();
  }

  const action = await prisma.action.findUnique({
    where: { id: actionId },
  });

  if (!action || action.agentId !== agentId) {
    notFound();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href={`/agents/${agentId}/actions`}
          className="inline-flex items-center justify-center rounded-md border p-2 hover:bg-muted transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Edit Action</h1>
          <p className="text-sm text-muted-foreground">
            Update {action.name} for {agent.name}
          </p>
        </div>
      </div>

      {/* Form */}
      <ActionForm
        agentId={agentId}
        action={{
          id: action.id,
          name: action.name,
          description: action.description,
          type: action.type,
          endpointUrl: action.endpointUrl,
          httpMethod: action.httpMethod,
          headers: action.headers as Record<string, string> | null,
          paramsSchema: action.paramsSchema as Record<string, unknown> | null,
          config: action.config as Record<string, unknown> | null,
          isActive: action.isActive,
        }}
      />
    </div>
  );
}
