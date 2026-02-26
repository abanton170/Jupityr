import { requireAuth } from "@/lib/auth-utils";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { ChatInterface } from "@/components/chat-interface";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function AgentChatPage({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  const user = await requireAuth();
  const { agentId } = await params;

  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    select: {
      id: true,
      userId: true,
      name: true,
      model: true,
      welcomeMessage: true,
      suggestedQuestions: true,
      primaryColor: true,
      isActive: true,
    },
  });

  if (!agent || agent.userId !== user.id) {
    notFound();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Link
          href={`/agents/${agentId}`}
          className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Agent
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Test Chat: {agent.name}
          </h1>
          <p className="text-sm text-muted-foreground">
            Test your agent&apos;s responses in real-time. Messages are saved to
            conversation history.
          </p>
        </div>
      </div>

      {!agent.isActive && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800 dark:border-yellow-900 dark:bg-yellow-950 dark:text-yellow-200">
          This agent is currently inactive. Activate it from the agent settings
          to make it available for public use.
        </div>
      )}

      <ChatInterface
        agentId={agent.id}
        agentName={agent.name}
        welcomeMessage={agent.welcomeMessage}
        suggestedQuestions={agent.suggestedQuestions}
        model={agent.model}
        primaryColor={agent.primaryColor}
      />
    </div>
  );
}
