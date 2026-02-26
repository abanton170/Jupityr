import { requireAuth } from "@/lib/auth-utils";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { ArrowLeft, Plug } from "lucide-react";
import Link from "next/link";
import { IntegrationConfig } from "@/components/integration-config";

export default async function IntegrationsPage({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  const user = await requireAuth();
  const { agentId } = await params;

  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    include: {
      integrations: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          platform: true,
          config: true,
          isActive: true,
          createdAt: true,
        },
      },
    },
  });

  if (!agent || agent.userId !== user.id) {
    notFound();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href={`/agents/${agentId}`}
          className="inline-flex items-center justify-center rounded-md border p-2 hover:bg-muted transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Plug className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Integrations</h1>
            <p className="text-sm text-muted-foreground">
              Connect {agent.name} to external platforms and services.
            </p>
          </div>
        </div>
      </div>

      {/* Integration config (client component) */}
      <IntegrationConfig
        agentId={agentId}
        integrations={agent.integrations.map((i) => ({
          id: i.id,
          platform: i.platform,
          config: i.config as Record<string, unknown> | null,
          isActive: i.isActive,
          createdAt: i.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
