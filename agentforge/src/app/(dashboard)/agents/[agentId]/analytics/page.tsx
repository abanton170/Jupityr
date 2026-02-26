import { requireAuth } from "@/lib/auth-utils";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  MessageSquare,
  Users,
  BarChart3,
  AlertTriangle,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { VolumeChart, SentimentChart, TopicsChart } from "@/components/analytics-charts";
import { subDays, format, startOfDay } from "date-fns";

export default async function AnalyticsPage({
  params,
  searchParams,
}: {
  params: Promise<{ agentId: string }>;
  searchParams: Promise<{ range?: string }>;
}) {
  const user = await requireAuth();
  const { agentId } = await params;
  const { range } = await searchParams;

  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    select: { id: true, userId: true, name: true },
  });

  if (!agent || agent.userId !== user.id) {
    notFound();
  }

  // Determine date range
  const days = range === "90d" ? 90 : range === "30d" ? 30 : 7;
  const sinceDate = startOfDay(subDays(new Date(), days));

  // Fetch aggregate stats
  const [totalConversations, totalMessages, totalLeads, avgConfidenceResult] =
    await Promise.all([
      prisma.conversation.count({ where: { agentId } }),
      prisma.message.count({
        where: { conversation: { agentId } },
      }),
      prisma.lead.count({ where: { agentId } }),
      prisma.message.aggregate({
        where: {
          conversation: { agentId },
          role: "ASSISTANT",
          confidence: { not: null },
        },
        _avg: { confidence: true },
      }),
    ]);

  const avgConfidence = avgConfidenceResult._avg.confidence;

  // Conversations over time (within date range)
  const conversationsInRange = await prisma.conversation.findMany({
    where: {
      agentId,
      createdAt: { gte: sinceDate },
    },
    select: { createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  // Group by day
  const volumeMap = new Map<string, number>();
  for (let i = 0; i < days; i++) {
    const day = format(subDays(new Date(), days - 1 - i), "MMM dd");
    volumeMap.set(day, 0);
  }
  for (const conv of conversationsInRange) {
    const day = format(conv.createdAt, "MMM dd");
    volumeMap.set(day, (volumeMap.get(day) ?? 0) + 1);
  }
  const volumeData = Array.from(volumeMap.entries()).map(([date, count]) => ({
    date,
    count,
  }));

  // Sentiment breakdown
  const sentimentGroups = await prisma.conversation.groupBy({
    by: ["sentiment"],
    where: { agentId },
    _count: { id: true },
  });

  const sentimentData = [
    {
      name: "positive",
      value:
        sentimentGroups.find((s) => s.sentiment === "positive")?._count.id ?? 0,
    },
    {
      name: "negative",
      value:
        sentimentGroups.find((s) => s.sentiment === "negative")?._count.id ?? 0,
    },
    {
      name: "neutral",
      value:
        sentimentGroups.find((s) => s.sentiment === "neutral")?._count.id ?? 0,
    },
    {
      name: "unclassified",
      value:
        sentimentGroups.find((s) => s.sentiment === null)?._count.id ?? 0,
    },
  ];

  // Top topics
  const topicGroups = await prisma.conversation.groupBy({
    by: ["topic"],
    where: { agentId, topic: { not: null } },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: 10,
  });

  const topicsData = topicGroups.map((t) => ({
    topic: t.topic ?? "Unknown",
    count: t._count.id,
  }));

  // Low confidence questions
  const lowConfidenceMessages = await prisma.message.findMany({
    where: {
      conversation: { agentId },
      role: "ASSISTANT",
      confidence: { lt: 0.5, not: null },
    },
    select: {
      id: true,
      content: true,
      confidence: true,
      createdAt: true,
      conversation: {
        select: {
          id: true,
          messages: {
            where: { role: "USER" },
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { content: true },
          },
        },
      },
    },
    orderBy: { confidence: "asc" },
    take: 20,
  });

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
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="text-sm text-muted-foreground">{agent.name}</p>
        </div>
      </div>

      {/* Date Range Selector */}
      <div className="flex gap-2">
        {(["7d", "30d", "90d"] as const).map((r) => {
          const isActive =
            r === (range ?? "7d");
          return (
            <Link
              key={r}
              href={`/agents/${agentId}/analytics?range=${r}`}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {r === "7d" ? "7 days" : r === "30d" ? "30 days" : "90 days"}
            </Link>
          );
        })}
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Total Conversations
            </CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalConversations}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Messages</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMessages}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Leads Captured
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalLeads}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Avg Confidence
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {avgConfidence != null
                ? `${(avgConfidence * 100).toFixed(1)}%`
                : "N/A"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Volume Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Conversations Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <VolumeChart data={volumeData} />
        </CardContent>
      </Card>

      {/* Sentiment + Topics */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Sentiment Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <SentimentChart data={sentimentData} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Top Topics</CardTitle>
          </CardHeader>
          <CardContent>
            <TopicsChart data={topicsData} />
          </CardContent>
        </Card>
      </div>

      {/* Knowledge Gaps */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Knowledge Gaps (Low Confidence Questions)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {lowConfidenceMessages.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No low-confidence responses found. Your knowledge base is
              covering questions well.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User Question</TableHead>
                  <TableHead>Confidence</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Conversation</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lowConfidenceMessages.map((msg) => (
                  <TableRow key={msg.id}>
                    <TableCell className="max-w-sm truncate">
                      {msg.conversation.messages[0]?.content ??
                        "(no user message)"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="destructive">
                        {((msg.confidence ?? 0) * 100).toFixed(0)}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(msg.createdAt, "MMM dd, yyyy")}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/agents/${agentId}/conversations/${msg.conversation.id}`}
                        className="text-sm text-primary hover:underline"
                      >
                        View
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
