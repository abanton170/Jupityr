import { requireAuth } from "@/lib/auth-utils";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import {
  Bot,
  Database,
  MessageSquare,
  BarChart3,
  Settings,
  ArrowLeft,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { AgentDetailTabs } from "./agent-detail-tabs";

export default async function AgentDetailPage({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  const user = await requireAuth();
  const { agentId } = await params;

  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    include: {
      dataSources: {
        orderBy: { createdAt: "desc" },
      },
      _count: {
        select: {
          conversations: true,
          dataSources: true,
          leads: true,
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
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/agents"
            className="inline-flex items-center justify-center rounded-md border p-2 hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="flex items-center gap-3">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-lg text-white"
              style={{ backgroundColor: agent.primaryColor }}
            >
              <Bot className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight">
                  {agent.name}
                </h1>
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
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary">{agent.model}</Badge>
                {agent.description && (
                  <p className="text-sm text-muted-foreground">
                    {agent.description}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border bg-card p-4 text-center">
          <p className="text-2xl font-bold">{agent._count.conversations}</p>
          <p className="text-sm text-muted-foreground">Conversations</p>
        </div>
        <div className="rounded-xl border bg-card p-4 text-center">
          <p className="text-2xl font-bold">{agent._count.dataSources}</p>
          <p className="text-sm text-muted-foreground">Data Sources</p>
        </div>
        <div className="rounded-xl border bg-card p-4 text-center">
          <p className="text-2xl font-bold">{agent._count.leads}</p>
          <p className="text-sm text-muted-foreground">Leads</p>
        </div>
      </div>

      {/* Tabs */}
      <AgentDetailTabs
        agent={{
          id: agent.id,
          name: agent.name,
          description: agent.description,
          systemPrompt: agent.systemPrompt,
          model: agent.model,
          temperature: agent.temperature,
          maxTokens: agent.maxTokens,
          welcomeMessage: agent.welcomeMessage,
          suggestedQuestions: agent.suggestedQuestions,
          primaryColor: agent.primaryColor,
          position: agent.position,
        }}
        dataSources={agent.dataSources.map((ds) => ({
          id: ds.id,
          name: ds.name,
          type: ds.type,
          status: ds.status,
          charCount: ds.charCount,
          chunkCount: ds.chunkCount,
          createdAt: ds.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
