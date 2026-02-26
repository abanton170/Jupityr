import { requireAuth } from "@/lib/auth-utils";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ActionForm } from "@/components/action-form";

export default async function NewActionPage({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  const user = await requireAuth();
  const { agentId } = await params;

  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    select: { id: true, userId: true, name: true },
  });

  if (!agent || agent.userId !== user.id) {
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
          <h1 className="text-2xl font-bold tracking-tight">New Action</h1>
          <p className="text-sm text-muted-foreground">
            Add a new action to {agent.name}
          </p>
        </div>
      </div>

      {/* Form */}
      <ActionForm agentId={agentId} />
    </div>
  );
}
