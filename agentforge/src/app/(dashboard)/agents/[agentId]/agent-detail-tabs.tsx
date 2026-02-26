"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  AgentSettingsForm,
  type AgentFormData,
} from "@/components/agent-settings-form";
import {
  Settings,
  Database,
  MessageSquare,
  BarChart3,
  FileText,
  Globe,
  HelpCircle,
  Upload,
  ExternalLink,
  Trash2,
} from "lucide-react";
import Link from "next/link";

interface DataSourceInfo {
  id: string;
  name: string;
  type: string;
  status: string;
  charCount: number;
  chunkCount: number;
  createdAt: string;
}

interface AgentInfo {
  id: string;
  name: string;
  description: string | null;
  systemPrompt: string;
  model: string;
  temperature: number;
  maxTokens: number;
  welcomeMessage: string;
  suggestedQuestions: string[];
  primaryColor: string;
  position: string;
}

interface AgentDetailTabsProps {
  agent: AgentInfo;
  dataSources: DataSourceInfo[];
}

const STATUS_STYLES: Record<string, string> = {
  COMPLETED: "bg-green-100 text-green-700",
  PROCESSING: "bg-blue-100 text-blue-700",
  PENDING: "bg-yellow-100 text-yellow-700",
  FAILED: "bg-red-100 text-red-700",
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
  URL: <Globe className="h-4 w-4" />,
  FILE: <FileText className="h-4 w-4" />,
  TEXT: <FileText className="h-4 w-4" />,
  QA: <HelpCircle className="h-4 w-4" />,
};

export function AgentDetailTabs({ agent, dataSources }: AgentDetailTabsProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  async function handleSettingsSave(data: AgentFormData) {
    setIsLoading(true);
    setSaveMessage(null);

    try {
      const res = await fetch(`/api/agents/${agent.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Failed to update agent");
      }

      setSaveMessage({
        type: "success",
        text: "Agent settings saved successfully.",
      });
      router.refresh();
    } catch (err) {
      setSaveMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to save settings",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDelete() {
    if (
      !confirm(
        "Are you sure you want to delete this agent? This action cannot be undone and will remove all associated data sources, conversations, and leads."
      )
    ) {
      return;
    }

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/agents/${agent.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Failed to delete agent");
      }

      router.push("/agents");
    } catch (err) {
      alert(
        err instanceof Error ? err.message : "Failed to delete agent"
      );
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <Tabs defaultValue="settings">
      <TabsList className="w-full justify-start">
        <TabsTrigger value="settings" className="gap-1.5">
          <Settings className="h-4 w-4" />
          Settings
        </TabsTrigger>
        <TabsTrigger value="data-sources" className="gap-1.5">
          <Database className="h-4 w-4" />
          Data Sources
        </TabsTrigger>
        <TabsTrigger value="chat" className="gap-1.5">
          <MessageSquare className="h-4 w-4" />
          Chat
        </TabsTrigger>
        <TabsTrigger value="analytics" className="gap-1.5">
          <BarChart3 className="h-4 w-4" />
          Analytics
        </TabsTrigger>
      </TabsList>

      {/* Settings Tab */}
      <TabsContent value="settings" className="mt-6">
        {saveMessage && (
          <div
            className={`mb-6 rounded-lg border p-4 text-sm ${
              saveMessage.type === "success"
                ? "border-green-200 bg-green-50 text-green-700"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {saveMessage.text}
          </div>
        )}
        <AgentSettingsForm
          agent={agent}
          onSubmit={handleSettingsSave}
          isLoading={isLoading}
        />

        {/* Danger Zone */}
        <div className="mt-8 rounded-xl border border-red-200 bg-card p-6">
          <h3 className="text-lg font-semibold text-red-600">Danger Zone</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Permanently delete this agent and all of its data including
            conversations, data sources, and leads.
          </p>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="mt-4 inline-flex items-center gap-2 rounded-lg border border-red-300 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            {isDeleting ? "Deleting..." : "Delete Agent"}
          </button>
        </div>
      </TabsContent>

      {/* Data Sources Tab */}
      <TabsContent value="data-sources" className="mt-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Data Sources</h3>
              <p className="text-sm text-muted-foreground">
                Knowledge base that powers your agent&apos;s responses.
              </p>
            </div>
            <Link
              href={`/agents/${agent.id}/sources`}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Upload className="h-4 w-4" />
              Add Source
            </Link>
          </div>

          {dataSources.length === 0 ? (
            <div className="rounded-xl border bg-card p-12 text-center">
              <Database className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">
                No data sources yet
              </h3>
              <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
                Add websites, documents, or text to train your agent on your
                company&apos;s knowledge base.
              </p>
              <Link
                href={`/agents/${agent.id}/sources`}
                className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <Upload className="h-4 w-4" />
                Add Your First Source
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {dataSources.map((ds) => (
                <div
                  key={ds.id}
                  className="flex items-center justify-between rounded-xl border bg-card p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                      {TYPE_ICONS[ds.type] ?? (
                        <FileText className="h-4 w-4" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{ds.name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{ds.type}</span>
                        <span>-</span>
                        <span>
                          {ds.charCount.toLocaleString()} chars
                        </span>
                        <span>-</span>
                        <span>{ds.chunkCount} chunks</span>
                      </div>
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      STATUS_STYLES[ds.status] ?? "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {ds.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </TabsContent>

      {/* Chat Tab */}
      <TabsContent value="chat" className="mt-6">
        <div className="rounded-xl border bg-card p-12 text-center">
          <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">Test Your Agent</h3>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
            Open the chat interface to test your agent&apos;s responses and
            behavior before deploying it.
          </p>
          <Link
            href={`/agents/${agent.id}/chat`}
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
            Open Chat
          </Link>
        </div>
      </TabsContent>

      {/* Analytics Tab */}
      <TabsContent value="analytics" className="mt-6">
        <div className="rounded-xl border bg-card p-12 text-center">
          <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">Analytics Coming Soon</h3>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
            Track conversation metrics, customer satisfaction, response quality,
            and lead generation performance.
          </p>
        </div>
      </TabsContent>
    </Tabs>
  );
}
