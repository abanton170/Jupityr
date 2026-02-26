"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  MessageSquare,
  Webhook,
  Phone,
  Headphones,
  Trash2,
  Plus,
  CheckCircle,
  XCircle,
  Loader2,
  Send,
} from "lucide-react";

type Platform = "SLACK" | "WHATSAPP" | "MESSENGER" | "ZENDESK" | "STRIPE" | "ZAPIER";

interface IntegrationInfo {
  id: string;
  platform: Platform;
  config: Record<string, unknown> | null;
  isActive: boolean;
  createdAt: string;
}

interface IntegrationConfigProps {
  agentId: string;
  integrations: IntegrationInfo[];
}

const PLATFORMS: {
  id: Platform;
  name: string;
  description: string;
  icon: React.ReactNode;
  fields: { key: string; label: string; placeholder: string; type?: string }[];
  eventTypes?: string[];
}[] = [
  {
    id: "SLACK",
    name: "Slack",
    description: "Send notifications to Slack channels via incoming webhooks.",
    icon: <MessageSquare className="h-5 w-5" />,
    fields: [
      {
        key: "webhookUrl",
        label: "Webhook URL",
        placeholder: "https://hooks.slack.com/services/...",
      },
      {
        key: "channel",
        label: "Channel (optional)",
        placeholder: "#general",
      },
    ],
  },
  {
    id: "ZAPIER",
    name: "Zapier / Webhook",
    description:
      "Send events to Zapier or any webhook URL for custom automations.",
    icon: <Webhook className="h-5 w-5" />,
    fields: [
      {
        key: "webhookUrl",
        label: "Webhook URL",
        placeholder: "https://hooks.zapier.com/...",
      },
    ],
    eventTypes: [
      "conversation.started",
      "conversation.ended",
      "lead.captured",
      "action.executed",
      "escalation.triggered",
    ],
  },
  {
    id: "WHATSAPP",
    name: "WhatsApp",
    description: "Connect to WhatsApp Business API for customer messaging.",
    icon: <Phone className="h-5 w-5" />,
    fields: [
      {
        key: "phoneNumberId",
        label: "Phone Number ID",
        placeholder: "Enter your WhatsApp Business phone number ID",
      },
      {
        key: "accessToken",
        label: "Access Token",
        placeholder: "Enter your access token",
        type: "password",
      },
    ],
  },
  {
    id: "ZENDESK",
    name: "Zendesk",
    description: "Escalate conversations to Zendesk support tickets.",
    icon: <Headphones className="h-5 w-5" />,
    fields: [
      {
        key: "subdomain",
        label: "Zendesk Subdomain",
        placeholder: "yourcompany",
      },
      {
        key: "apiToken",
        label: "API Token",
        placeholder: "Enter your Zendesk API token",
        type: "password",
      },
      {
        key: "email",
        label: "Agent Email",
        placeholder: "agent@yourcompany.com",
      },
    ],
  },
];

export function IntegrationConfig({
  agentId,
  integrations: initialIntegrations,
}: IntegrationConfigProps) {
  const router = useRouter();
  const [integrations, setIntegrations] =
    useState<IntegrationInfo[]>(initialIntegrations);
  const [addingPlatform, setAddingPlatform] = useState<Platform | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{
    id: string;
    success: boolean;
    message: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const connectedPlatforms = new Set(integrations.map((i) => i.platform));

  async function handleAdd(platform: Platform) {
    setIsSubmitting(true);
    setError(null);

    try {
      const platformConfig = PLATFORMS.find((p) => p.id === platform);
      if (!platformConfig) return;

      // Separate credentials (sensitive) from config (non-sensitive)
      const credentials: Record<string, string> = {};
      const config: Record<string, unknown> = {};

      for (const field of platformConfig.fields) {
        const value = formData[field.key];
        if (!value) continue;

        if (field.type === "password" || field.key === "accessToken" || field.key === "apiToken") {
          credentials[field.key] = value;
        } else {
          config[field.key] = value;
        }
      }

      if (selectedEvents.length > 0) {
        config.eventTypes = selectedEvents;
      }

      const res = await fetch(`/api/agents/${agentId}/integrations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, config, credentials }),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Failed to create integration");
      }

      const newIntegration = await res.json();
      setIntegrations((prev) => [
        {
          ...newIntegration,
          createdAt: newIntegration.createdAt,
        },
        ...prev,
      ]);
      setAddingPlatform(null);
      setFormData({});
      setSelectedEvents([]);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add integration");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(integrationId: string) {
    if (!confirm("Are you sure you want to remove this integration?")) return;

    setIsDeleting(integrationId);
    try {
      const res = await fetch(
        `/api/agents/${agentId}/integrations/${integrationId}`,
        { method: "DELETE" }
      );

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Failed to delete integration");
      }

      setIntegrations((prev) => prev.filter((i) => i.id !== integrationId));
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete integration");
    } finally {
      setIsDeleting(null);
    }
  }

  async function handleToggle(integrationId: string, isActive: boolean) {
    try {
      const res = await fetch(
        `/api/agents/${agentId}/integrations/${integrationId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive: !isActive }),
        }
      );

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Failed to update integration");
      }

      setIntegrations((prev) =>
        prev.map((i) =>
          i.id === integrationId ? { ...i, isActive: !isActive } : i
        )
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to toggle integration");
    }
  }

  async function handleTestWebhook(integration: IntegrationInfo) {
    setIsTesting(integration.id);
    setTestResult(null);

    try {
      const webhookUrl =
        (integration.config as Record<string, string> | null)?.webhookUrl;

      if (!webhookUrl) {
        setTestResult({
          id: integration.id,
          success: false,
          message: "No webhook URL configured",
        });
        return;
      }

      // For Slack, use the Slack message format
      if (integration.platform === "SLACK") {
        const res = await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: "Test message from AgentForge - your integration is working!",
            blocks: [
              {
                type: "section",
                text: {
                  type: "mrkdwn",
                  text: "*AgentForge Test*\nYour Slack integration is connected and working correctly.",
                },
              },
            ],
          }),
        });

        setTestResult({
          id: integration.id,
          success: res.ok,
          message: res.ok
            ? "Test message sent successfully!"
            : `Failed with status ${res.status}`,
        });
      } else {
        // Generic webhook test
        const res = await fetch(webhookUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-AgentForge-Event": "test",
          },
          body: JSON.stringify({
            type: "test",
            agentId,
            timestamp: new Date().toISOString(),
            data: { message: "This is a test webhook from AgentForge" },
          }),
        });

        setTestResult({
          id: integration.id,
          success: res.ok,
          message: res.ok
            ? "Webhook test successful!"
            : `Failed with status ${res.status}`,
        });
      }
    } catch (err) {
      setTestResult({
        id: integration.id,
        success: false,
        message:
          err instanceof Error ? err.message : "Failed to send test webhook",
      });
    } finally {
      setIsTesting(null);
    }
  }

  return (
    <div className="space-y-8">
      {/* Connected Integrations */}
      {integrations.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Connected Integrations</h2>
          <div className="space-y-3">
            {integrations.map((integration) => {
              const platform = PLATFORMS.find(
                (p) => p.id === integration.platform
              );
              return (
                <div
                  key={integration.id}
                  className="flex items-center justify-between rounded-xl border bg-card p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                      {platform?.icon ?? <Webhook className="h-5 w-5" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">
                          {platform?.name ?? integration.platform}
                        </p>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                            integration.isActive
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {integration.isActive ? (
                            <>
                              <CheckCircle className="h-3 w-3" />
                              Active
                            </>
                          ) : (
                            <>
                              <XCircle className="h-3 w-3" />
                              Inactive
                            </>
                          )}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Connected{" "}
                        {new Date(integration.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Test button for webhook-based integrations */}
                    {(integration.platform === "SLACK" ||
                      integration.platform === "ZAPIER") && (
                      <button
                        onClick={() => handleTestWebhook(integration)}
                        disabled={isTesting === integration.id}
                        className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors disabled:opacity-50"
                      >
                        {isTesting === integration.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Send className="h-3 w-3" />
                        )}
                        Test
                      </button>
                    )}
                    <button
                      onClick={() =>
                        handleToggle(integration.id, integration.isActive)
                      }
                      className="rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors"
                    >
                      {integration.isActive ? "Disable" : "Enable"}
                    </button>
                    <button
                      onClick={() => handleDelete(integration.id)}
                      disabled={isDeleting === integration.id}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                    >
                      {isDeleting === integration.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Trash2 className="h-3 w-3" />
                      )}
                      Remove
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Test result display */}
          {testResult && (
            <div
              className={`rounded-lg border p-3 text-sm ${
                testResult.success
                  ? "border-green-200 bg-green-50 text-green-700"
                  : "border-red-200 bg-red-50 text-red-700"
              }`}
            >
              {testResult.message}
            </div>
          )}
        </div>
      )}

      {/* Available Platforms */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Available Integrations</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {PLATFORMS.map((platform) => {
            const isConnected = connectedPlatforms.has(platform.id);
            const isAdding = addingPlatform === platform.id;

            return (
              <div
                key={platform.id}
                className={`rounded-xl border bg-card p-5 ${
                  isAdding ? "ring-2 ring-primary" : ""
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                      {platform.icon}
                    </div>
                    <div>
                      <p className="font-medium">{platform.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {platform.description}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Add form */}
                {isAdding ? (
                  <div className="mt-4 space-y-3">
                    {platform.fields.map((field) => (
                      <div key={field.key}>
                        <label className="mb-1 block text-sm font-medium">
                          {field.label}
                        </label>
                        <input
                          type={field.type || "text"}
                          placeholder={field.placeholder}
                          value={formData[field.key] || ""}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              [field.key]: e.target.value,
                            }))
                          }
                          className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                    ))}

                    {/* Event type selection for Zapier/Webhook */}
                    {platform.eventTypes && (
                      <div>
                        <label className="mb-2 block text-sm font-medium">
                          Event Types
                        </label>
                        <div className="space-y-1.5">
                          {platform.eventTypes.map((event) => (
                            <label
                              key={event}
                              className="flex items-center gap-2 text-sm"
                            >
                              <input
                                type="checkbox"
                                checked={selectedEvents.includes(event)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedEvents((prev) => [
                                      ...prev,
                                      event,
                                    ]);
                                  } else {
                                    setSelectedEvents((prev) =>
                                      prev.filter((ev) => ev !== event)
                                    );
                                  }
                                }}
                                className="rounded border"
                              />
                              <span className="font-mono text-xs">{event}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    {error && (
                      <p className="text-sm text-red-600">{error}</p>
                    )}

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAdd(platform.id)}
                        disabled={isSubmitting}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                      >
                        {isSubmitting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Plus className="h-4 w-4" />
                        )}
                        Connect
                      </button>
                      <button
                        onClick={() => {
                          setAddingPlatform(null);
                          setFormData({});
                          setSelectedEvents([]);
                          setError(null);
                        }}
                        className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4">
                    {isConnected ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-600">
                        <CheckCircle className="h-3.5 w-3.5" />
                        Connected
                      </span>
                    ) : (
                      <button
                        onClick={() => {
                          setAddingPlatform(platform.id);
                          setFormData({});
                          setSelectedEvents([]);
                          setError(null);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium hover:bg-muted transition-colors"
                      >
                        <Plus className="h-4 w-4" />
                        Connect
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
