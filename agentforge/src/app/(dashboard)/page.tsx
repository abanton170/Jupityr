import { requireAuth } from "@/lib/auth-utils";
import { prisma } from "@/lib/db";
import { Bot, MessageSquare, Users, Activity } from "lucide-react";
import Link from "next/link";

export default async function DashboardPage() {
  const user = await requireAuth();

  const [agentCount, conversationCount, leadCount, recentAgents] =
    await Promise.all([
      prisma.agent.count({ where: { userId: user.id } }),
      prisma.conversation.count({
        where: { agent: { userId: user.id } },
      }),
      prisma.lead.count({
        where: { agent: { userId: user.id } },
      }),
      prisma.agent.findMany({
        where: { userId: user.id },
        orderBy: { updatedAt: "desc" },
        take: 5,
        include: {
          _count: {
            select: { conversations: true, dataSources: true },
          },
        },
      }),
    ]);

  const stats = [
    {
      label: "Total Agents",
      value: agentCount,
      icon: Bot,
      href: "/agents",
    },
    {
      label: "Conversations",
      value: conversationCount,
      icon: MessageSquare,
      href: "/agents",
    },
    {
      label: "Leads Captured",
      value: leadCount,
      icon: Users,
      href: "/agents",
    },
    {
      label: "Active Agents",
      value: recentAgents.filter((a) => a.isActive).length,
      icon: Activity,
      href: "/agents",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {user.name || "there"}! Here&apos;s an overview of your
          AI agents.
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="rounded-xl border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </p>
              <stat.icon className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="mt-2 text-3xl font-bold">{stat.value}</p>
          </Link>
        ))}
      </div>

      {/* Recent agents */}
      <div>
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Recent Agents</h2>
          <Link
            href="/agents"
            className="text-sm text-primary hover:underline"
          >
            View all
          </Link>
        </div>
        {recentAgents.length === 0 ? (
          <div className="mt-4 rounded-xl border bg-card p-12 text-center">
            <Bot className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No agents yet</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Create your first AI agent to get started.
            </p>
            <Link
              href="/agents/new"
              className="mt-4 inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Create Agent
            </Link>
          </div>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recentAgents.map((agent) => (
              <Link
                key={agent.id}
                href={`/agents/${agent.id}`}
                className="rounded-xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-lg text-white"
                      style={{ backgroundColor: agent.primaryColor }}
                    >
                      <Bot className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{agent.name}</h3>
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
                  {agent.description || "No description"}
                </p>
                <div className="mt-4 flex gap-4 text-xs text-muted-foreground">
                  <span>{agent._count.conversations} conversations</span>
                  <span>{agent._count.dataSources} sources</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
