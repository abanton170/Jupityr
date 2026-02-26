import { requireAuth } from "@/lib/auth-utils";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MessageSquare, Search } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import type { Prisma } from "@prisma/client";

function SentimentBadge({ sentiment }: { sentiment: string | null }) {
  if (!sentiment) {
    return <Badge variant="outline">Unclassified</Badge>;
  }
  const variantMap: Record<string, "default" | "destructive" | "secondary"> = {
    positive: "default",
    negative: "destructive",
    neutral: "secondary",
  };
  return (
    <Badge variant={variantMap[sentiment] ?? "outline"}>
      {sentiment.charAt(0).toUpperCase() + sentiment.slice(1)}
    </Badge>
  );
}

export default async function ConversationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ agentId: string }>;
  searchParams: Promise<{
    search?: string;
    sentiment?: string;
    topic?: string;
    resolved?: string;
    page?: string;
  }>;
}) {
  const user = await requireAuth();
  const { agentId } = await params;
  const {
    search,
    sentiment,
    topic,
    resolved,
    page: pageParam,
  } = await searchParams;

  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    select: { id: true, userId: true, name: true },
  });

  if (!agent || agent.userId !== user.id) {
    notFound();
  }

  // Build filter
  const where: Prisma.ConversationWhereInput = { agentId };

  if (sentiment && sentiment !== "all") {
    if (sentiment === "unclassified") {
      where.sentiment = null;
    } else {
      where.sentiment = sentiment;
    }
  }

  if (topic && topic !== "all") {
    where.topic = topic;
  }

  if (resolved === "true") {
    where.isResolved = true;
  } else if (resolved === "false") {
    where.isResolved = false;
  }

  if (search) {
    where.messages = {
      some: {
        content: { contains: search, mode: "insensitive" },
      },
    };
  }

  const pageSize = 25;
  const currentPage = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);
  const skip = (currentPage - 1) * pageSize;

  const [conversations, totalCount, allTopics] = await Promise.all([
    prisma.conversation.findMany({
      where,
      include: {
        _count: { select: { messages: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.conversation.count({ where }),
    prisma.conversation.groupBy({
      by: ["topic"],
      where: { agentId, topic: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 20,
    }),
  ]);

  const totalPages = Math.ceil(totalCount / pageSize);

  // Build query string helper
  function buildQuery(overrides: Record<string, string | undefined>) {
    const params: Record<string, string> = {};
    if (search) params.search = search;
    if (sentiment) params.sentiment = sentiment;
    if (topic) params.topic = topic;
    if (resolved) params.resolved = resolved;
    if (pageParam) params.page = pageParam;
    Object.entries(overrides).forEach(([key, val]) => {
      if (val === undefined) {
        delete params[key];
      } else {
        params[key] = val;
      }
    });
    const qs = new URLSearchParams(params).toString();
    return qs ? `?${qs}` : "";
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
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Conversations</h1>
          <p className="text-sm text-muted-foreground">
            {agent.name} &mdash; {totalCount} total
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <form
          action={`/agents/${agentId}/conversations`}
          method="GET"
          className="relative"
        >
          {sentiment && (
            <input type="hidden" name="sentiment" value={sentiment} />
          )}
          {topic && <input type="hidden" name="topic" value={topic} />}
          {resolved && (
            <input type="hidden" name="resolved" value={resolved} />
          )}
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            name="search"
            placeholder="Search messages..."
            defaultValue={search ?? ""}
            className="flex h-9 rounded-md border border-input bg-transparent pl-9 pr-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </form>

        {/* Sentiment filter */}
        <div className="flex gap-1">
          {["all", "positive", "negative", "neutral", "unclassified"].map(
            (s) => (
              <Link
                key={s}
                href={`/agents/${agentId}/conversations${buildQuery({
                  sentiment: s === "all" ? undefined : s,
                  page: "1",
                })}`}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  (sentiment ?? "all") === s
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </Link>
            )
          )}
        </div>

        {/* Resolved filter */}
        <div className="flex gap-1">
          {[
            { label: "All", value: undefined },
            { label: "Resolved", value: "true" },
            { label: "Unresolved", value: "false" },
          ].map((opt) => (
            <Link
              key={opt.label}
              href={`/agents/${agentId}/conversations${buildQuery({
                resolved: opt.value,
                page: "1",
              })}`}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                (resolved ?? undefined) === opt.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {opt.label}
            </Link>
          ))}
        </div>

        {/* Topic filter */}
        {allTopics.length > 0 && (
          <div className="flex flex-wrap gap-1">
            <Link
              href={`/agents/${agentId}/conversations${buildQuery({
                topic: undefined,
                page: "1",
              })}`}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                !topic
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              All topics
            </Link>
            {allTopics.map((t) => (
              <Link
                key={t.topic}
                href={`/agents/${agentId}/conversations${buildQuery({
                  topic: t.topic ?? undefined,
                  page: "1",
                })}`}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  topic === t.topic
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {t.topic} ({t._count.id})
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Conversations Table */}
      {conversations.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border bg-card p-12 text-center">
          <MessageSquare className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-lg font-medium">No conversations found</p>
          <p className="text-sm text-muted-foreground mt-1">
            {search || sentiment || topic || resolved
              ? "Try adjusting your filters."
              : "Conversations will appear here once users start chatting with your agent."}
          </p>
        </div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Session ID</TableHead>
                <TableHead>Messages</TableHead>
                <TableHead>Sentiment</TableHead>
                <TableHead>Topic</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {conversations.map((conv) => (
                <TableRow key={conv.id}>
                  <TableCell>
                    <Link
                      href={`/agents/${agentId}/conversations/${conv.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {conv.sessionId.slice(0, 12)}...
                    </Link>
                  </TableCell>
                  <TableCell>{conv._count.messages}</TableCell>
                  <TableCell>
                    <SentimentBadge sentiment={conv.sentiment} />
                  </TableCell>
                  <TableCell className="text-sm">
                    {conv.topic ?? (
                      <span className="text-muted-foreground">--</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        conv.isResolved
                          ? "bg-green-100 text-green-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {conv.isResolved ? "Resolved" : "Open"}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(conv.createdAt, "MMM dd, yyyy HH:mm")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </p>
              <div className="flex gap-2">
                {currentPage > 1 && (
                  <Link
                    href={`/agents/${agentId}/conversations${buildQuery({
                      page: String(currentPage - 1),
                    })}`}
                    className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted transition-colors"
                  >
                    Previous
                  </Link>
                )}
                {currentPage < totalPages && (
                  <Link
                    href={`/agents/${agentId}/conversations${buildQuery({
                      page: String(currentPage + 1),
                    })}`}
                    className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted transition-colors"
                  >
                    Next
                  </Link>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
