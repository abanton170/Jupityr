import { requireAuth } from "@/lib/auth-utils";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Bot, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { format } from "date-fns";
import { ConversationActions } from "./conversation-actions";

export default async function ConversationDetailPage({
  params,
}: {
  params: Promise<{ agentId: string; conversationId: string }>;
}) {
  const user = await requireAuth();
  const { agentId, conversationId } = await params;

  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    select: { id: true, userId: true, name: true },
  });

  if (!agent || agent.userId !== user.id) {
    notFound();
  }

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!conversation || conversation.agentId !== agentId) {
    notFound();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link
            href={`/agents/${agentId}/conversations`}
            className="inline-flex items-center justify-center rounded-md border p-2 hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Conversation Detail
            </h1>
            <p className="text-sm text-muted-foreground">
              {agent.name} &mdash; Session{" "}
              {conversation.sessionId.slice(0, 12)}...
            </p>
          </div>
        </div>
      </div>

      {/* Metadata */}
      <div className="flex flex-wrap items-center gap-3">
        {conversation.sentiment && (
          <Badge
            variant={
              conversation.sentiment === "positive"
                ? "default"
                : conversation.sentiment === "negative"
                  ? "destructive"
                  : "secondary"
            }
          >
            {conversation.sentiment.charAt(0).toUpperCase() +
              conversation.sentiment.slice(1)}
          </Badge>
        )}
        {conversation.topic && (
          <Badge variant="outline">{conversation.topic}</Badge>
        )}
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
            conversation.isResolved
              ? "bg-green-100 text-green-700"
              : "bg-yellow-100 text-yellow-700"
          }`}
        >
          {conversation.isResolved ? "Resolved" : "Open"}
        </span>
        <span className="text-sm text-muted-foreground">
          {format(conversation.createdAt, "MMM dd, yyyy HH:mm")}
        </span>
        <span className="text-sm text-muted-foreground">
          {conversation.messages.length} messages
        </span>
      </div>

      {/* Action buttons */}
      <ConversationActions
        agentId={agentId}
        conversationId={conversationId}
        isResolved={conversation.isResolved}
      />

      {/* Messages */}
      <Card>
        <CardHeader>
          <CardTitle>Transcript</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {conversation.messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${
                msg.role === "USER" ? "" : "flex-row-reverse"
              }`}
            >
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                  msg.role === "USER"
                    ? "bg-muted"
                    : "bg-primary text-primary-foreground"
                }`}
              >
                {msg.role === "USER" ? (
                  <User className="h-4 w-4" />
                ) : (
                  <Bot className="h-4 w-4" />
                )}
              </div>
              <div
                className={`flex max-w-[75%] flex-col gap-1 ${
                  msg.role === "USER" ? "items-start" : "items-end"
                }`}
              >
                <div
                  className={`rounded-lg px-4 py-2.5 text-sm ${
                    msg.role === "USER"
                      ? "bg-muted"
                      : "bg-primary/10 text-foreground"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {format(msg.createdAt, "HH:mm")}
                  </span>
                  {msg.role === "ASSISTANT" && msg.confidence != null && (
                    <span
                      className={`text-xs ${
                        msg.confidence < 0.5
                          ? "text-red-500"
                          : msg.confidence < 0.7
                            ? "text-yellow-500"
                            : "text-green-500"
                      }`}
                    >
                      {(msg.confidence * 100).toFixed(0)}% confidence
                    </span>
                  )}
                  {msg.role === "ASSISTANT" && (
                    <ConversationActions
                      agentId={agentId}
                      conversationId={conversationId}
                      isResolved={conversation.isResolved}
                      messageId={msg.id}
                      messageContent={msg.content}
                      reviseOnly
                    />
                  )}
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
