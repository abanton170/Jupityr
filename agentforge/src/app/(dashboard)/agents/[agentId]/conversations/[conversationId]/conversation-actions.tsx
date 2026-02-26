"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, RefreshCw, Pencil } from "lucide-react";
import { useRouter } from "next/navigation";

interface ConversationActionsProps {
  agentId: string;
  conversationId: string;
  isResolved: boolean;
  messageId?: string;
  messageContent?: string;
  reviseOnly?: boolean;
}

export function ConversationActions({
  agentId,
  conversationId,
  isResolved,
  messageId,
  messageContent,
  reviseOnly,
}: ConversationActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [classifying, setClassifying] = useState(false);
  const [revising, setRevising] = useState(false);
  const [revisedAnswer, setRevisedAnswer] = useState("");

  async function handleResolve() {
    setLoading(true);
    try {
      await fetch(
        `/api/agents/${agentId}/conversations/${conversationId}/resolve`,
        { method: "POST" }
      );
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleClassify() {
    setClassifying(true);
    try {
      await fetch(
        `/api/agents/${agentId}/conversations/classify`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conversationId }),
        }
      );
      router.refresh();
    } finally {
      setClassifying(false);
    }
  }

  async function handleRevise() {
    if (!revisedAnswer.trim() || !messageId) return;
    setLoading(true);
    try {
      await fetch(
        `/api/agents/${agentId}/conversations/${conversationId}/revise`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messageId, revisedAnswer: revisedAnswer.trim() }),
        }
      );
      setRevising(false);
      setRevisedAnswer("");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  // If reviseOnly, only show the revise button inline
  if (reviseOnly && messageId) {
    return (
      <>
        <button
          onClick={() => {
            setRevising(!revising);
            setRevisedAnswer(messageContent ?? "");
          }}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <Pencil className="inline h-3 w-3 mr-0.5" />
          Revise
        </button>
        {revising && (
          <div className="mt-2 w-full max-w-md">
            <textarea
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              rows={3}
              value={revisedAnswer}
              onChange={(e) => setRevisedAnswer(e.target.value)}
              placeholder="Enter the corrected answer..."
            />
            <div className="mt-1.5 flex gap-2">
              <Button size="sm" onClick={handleRevise} disabled={loading}>
                {loading ? "Saving..." : "Save as Q&A"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setRevising(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </>
    );
  }

  if (reviseOnly) return null;

  return (
    <div className="flex gap-2">
      <Button
        variant={isResolved ? "secondary" : "default"}
        size="sm"
        onClick={handleResolve}
        disabled={loading}
      >
        <CheckCircle2 className="h-4 w-4 mr-1" />
        {isResolved ? "Reopen" : "Mark as Resolved"}
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handleClassify}
        disabled={classifying}
      >
        <RefreshCw
          className={`h-4 w-4 mr-1 ${classifying ? "animate-spin" : ""}`}
        />
        {classifying ? "Classifying..." : "Classify"}
      </Button>
    </div>
  );
}
