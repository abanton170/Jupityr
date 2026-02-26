import { requireAuth } from "@/lib/auth-utils";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Users } from "lucide-react";
import { LeadsTable } from "@/components/leads-table";

export default async function LeadsPage({
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

  const [leads, totalCount] = await Promise.all([
    prisma.lead.findMany({
      where: { agentId },
      orderBy: { createdAt: "desc" },
      take: 25,
    }),
    prisma.lead.count({ where: { agentId } }),
  ]);

  // Serialize dates for client component
  const serializedLeads = leads.map((lead) => ({
    ...lead,
    customFields: lead.customFields as Record<string, unknown> | null,
    createdAt: lead.createdAt.toISOString(),
  }));

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
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Leads</h1>
            <p className="text-sm text-muted-foreground">
              {agent.name} &mdash; {totalCount} total leads captured
            </p>
          </div>
        </div>
      </div>

      {/* Leads Table */}
      <LeadsTable
        agentId={agentId}
        initialLeads={serializedLeads}
        initialTotal={totalCount}
      />
    </div>
  );
}
