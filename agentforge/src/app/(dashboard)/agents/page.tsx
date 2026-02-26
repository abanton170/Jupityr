import { requireAuth } from "@/lib/auth-utils";
import { prisma } from "@/lib/db";
import { Bot, Plus } from "lucide-react";
import Link from "next/link";

export default async function AgentsPage() {
  const user = await requireAuth();

  const agents = await prisma.agent.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    include: {
      _count: {
        select: { conversations: true, dataSources: true, leads: true },
      },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Agents</h1>
          <p className="text-muted-foreground">
            Manage your AI customer service agents.
          </p>
        </div>
        <Link
          href="/agents/new"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Create Agent
        </Link>
      </div>

      {agents.length === 0 ? (
        <div className="rounded-xl border bg-card p-16 text-center">
          <Bot className="mx-auto h-16 w-16 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">No agents yet</h3>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
            Create your first AI agent. Upload your company data and deploy a
            chat widget on your website in minutes.
          </p>
          <Link
            href="/agents/new"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Create Your First Agent
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent) => (
            <Link
              key={agent.id}
              href={`/agents/${agent.id}`}
              className="group rounded-xl border bg-card p-5 shadow-sm transition-all hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-lg text-white"
                    style={{ backgroundColor: agent.primaryColor }}
                  >
                    <Bot className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold group-hover:text-primary">
                      {agent.name}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {agent.model}
                    </p>
                  </div>
                </div>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                    agent.isActive
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {agent.isActive ? "Active" : "Inactive"}
                </span>
              </div>
              <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
                {agent.description || "No description provided"}
              </p>
              <div className="mt-4 grid grid-cols-3 gap-2 border-t pt-4">
                <div className="text-center">
                  <p className="text-lg font-semibold">
                    {agent._count.conversations}
                  </p>
                  <p className="text-xs text-muted-foreground">Chats</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-semibold">
                    {agent._count.dataSources}
                  </p>
                  <p className="text-xs text-muted-foreground">Sources</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-semibold">
                    {agent._count.leads}
                  </p>
                  <p className="text-xs text-muted-foreground">Leads</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
