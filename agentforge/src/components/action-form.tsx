"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Globe,
  Users,
  Bell,
  Search,
  Calendar,
  MousePointer,
  Loader2,
  Zap,
} from "lucide-react";

const ACTION_TYPES = [
  {
    value: "CUSTOM_API",
    label: "Custom API",
    description: "Call any external API endpoint",
    icon: <Globe className="h-4 w-4" />,
  },
  {
    value: "COLLECT_LEAD",
    label: "Collect Lead",
    description: "Gather visitor contact information",
    icon: <Users className="h-4 w-4" />,
  },
  {
    value: "SLACK_NOTIFY",
    label: "Slack Notify",
    description: "Send notifications to a Slack channel",
    icon: <Bell className="h-4 w-4" />,
  },
  {
    value: "WEB_SEARCH",
    label: "Web Search",
    description: "Search the web for information",
    icon: <Search className="h-4 w-4" />,
  },
  {
    value: "CALENDLY",
    label: "Calendly",
    description: "Schedule meetings via Calendly",
    icon: <Calendar className="h-4 w-4" />,
  },
  {
    value: "CUSTOM_BUTTON",
    label: "Custom Button",
    description: "Show a clickable button in chat",
    icon: <MousePointer className="h-4 w-4" />,
  },
] as const;

const HTTP_METHODS = ["GET", "POST", "PUT", "DELETE"] as const;

interface ActionData {
  id: string;
  name: string;
  description: string;
  type: string;
  endpointUrl: string | null;
  httpMethod: string | null;
  headers: Record<string, string> | null;
  paramsSchema: Record<string, unknown> | null;
  config: Record<string, unknown> | null;
  isActive: boolean;
}

interface ActionFormProps {
  agentId: string;
  action?: ActionData;
}

export function ActionForm({ agentId, action }: ActionFormProps) {
  const router = useRouter();
  const isEditing = !!action;

  const [name, setName] = useState(action?.name ?? "");
  const [description, setDescription] = useState(action?.description ?? "");
  const [type, setType] = useState(action?.type ?? "CUSTOM_API");
  const [endpointUrl, setEndpointUrl] = useState(action?.endpointUrl ?? "");
  const [httpMethod, setHttpMethod] = useState(action?.httpMethod ?? "POST");
  const [headersJson, setHeadersJson] = useState(
    action?.headers ? JSON.stringify(action.headers, null, 2) : ""
  );
  const [paramsSchemaJson, setParamsSchemaJson] = useState(
    action?.paramsSchema ? JSON.stringify(action.paramsSchema, null, 2) : ""
  );
  const [isActive, setIsActive] = useState(action?.isActive ?? true);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // COLLECT_LEAD specific fields
  const defaultLeadFields =
    (action?.config as Record<string, unknown>)?.fields ??
    (["name", "email"] as string[]);
  const [leadFields, setLeadFields] = useState<string[]>(
    defaultLeadFields as string[]
  );

  // SLACK_NOTIFY specific fields
  const [webhookUrl, setWebhookUrl] = useState(
    (action?.config as Record<string, unknown>)?.webhookUrl as string ?? ""
  );
  const [slackChannel, setSlackChannel] = useState(
    (action?.config as Record<string, unknown>)?.channel as string ?? ""
  );

  // WEB_SEARCH specific fields
  const [searchApiKey, setSearchApiKey] = useState(
    (action?.config as Record<string, unknown>)?.apiKey as string ?? ""
  );

  // CALENDLY specific fields
  const [calendlyUrl, setCalendlyUrl] = useState(
    (action?.config as Record<string, unknown>)?.calendlyUrl as string ?? ""
  );

  // CUSTOM_BUTTON specific fields
  const [buttonText, setButtonText] = useState(
    (action?.config as Record<string, unknown>)?.buttonText as string ?? ""
  );
  const [buttonUrl, setButtonUrl] = useState(
    (action?.config as Record<string, unknown>)?.buttonUrl as string ?? ""
  );
  const [buttonTarget, setButtonTarget] = useState(
    (action?.config as Record<string, unknown>)?.target as string ?? "_blank"
  );

  function validate(): boolean {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) newErrors.name = "Name is required";
    if (!description.trim()) newErrors.description = "Description is required";

    if (type === "CUSTOM_API") {
      if (!endpointUrl.trim()) newErrors.endpointUrl = "Endpoint URL is required";
      if (headersJson.trim()) {
        try {
          JSON.parse(headersJson);
        } catch {
          newErrors.headers = "Invalid JSON";
        }
      }
    }

    if (paramsSchemaJson.trim()) {
      try {
        JSON.parse(paramsSchemaJson);
      } catch {
        newErrors.paramsSchema = "Invalid JSON";
      }
    }

    if (type === "SLACK_NOTIFY" && !webhookUrl.trim()) {
      newErrors.webhookUrl = "Webhook URL is required";
    }

    if (type === "CALENDLY" && !calendlyUrl.trim()) {
      newErrors.calendlyUrl = "Calendly URL is required";
    }

    if (type === "CUSTOM_BUTTON") {
      if (!buttonText.trim()) newErrors.buttonText = "Button text is required";
      if (!buttonUrl.trim()) newErrors.buttonUrl = "Button URL is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function buildConfig(): Record<string, unknown> | undefined {
    switch (type) {
      case "COLLECT_LEAD":
        return { fields: leadFields };
      case "SLACK_NOTIFY":
        return { webhookUrl, channel: slackChannel || undefined };
      case "WEB_SEARCH":
        return searchApiKey ? { apiKey: searchApiKey } : undefined;
      case "CALENDLY":
        return { calendlyUrl };
      case "CUSTOM_BUTTON":
        return { buttonText, buttonUrl, target: buttonTarget };
      default:
        return undefined;
    }
  }

  function buildParamsSchema(): Record<string, unknown> | undefined {
    if (type === "COLLECT_LEAD") {
      const properties: Record<string, unknown> = {};
      const required: string[] = [];
      for (const field of leadFields) {
        properties[field] = { type: "string", description: `The visitor's ${field}` };
        if (field === "email" || field === "name") {
          required.push(field);
        }
      }
      return {
        type: "object",
        properties,
        required: required.length > 0 ? required : undefined,
      };
    }

    if (type === "CALENDLY") {
      return {
        type: "object",
        properties: {},
      };
    }

    if (type === "CUSTOM_BUTTON") {
      return {
        type: "object",
        properties: {},
      };
    }

    if (type === "SLACK_NOTIFY") {
      return {
        type: "object",
        properties: {
          message: { type: "string", description: "The notification message to send" },
        },
        required: ["message"],
      };
    }

    if (type === "WEB_SEARCH") {
      return {
        type: "object",
        properties: {
          query: { type: "string", description: "The search query" },
        },
        required: ["query"],
      };
    }

    if (paramsSchemaJson.trim()) {
      try {
        return JSON.parse(paramsSchemaJson);
      } catch {
        return undefined;
      }
    }

    return undefined;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    try {
      const payload: Record<string, unknown> = {
        name: name.trim(),
        description: description.trim(),
        type,
        isActive,
        config: buildConfig(),
        paramsSchema: buildParamsSchema(),
      };

      if (type === "CUSTOM_API") {
        payload.endpointUrl = endpointUrl.trim();
        payload.httpMethod = httpMethod;
        if (headersJson.trim()) {
          payload.headers = JSON.parse(headersJson);
        }
      }

      const url = isEditing
        ? `/api/agents/${agentId}/actions/${action.id}`
        : `/api/agents/${agentId}/actions`;

      const res = await fetch(url, {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Failed to save action");
      }

      router.push(`/agents/${agentId}/actions`);
      router.refresh();
    } catch (err) {
      setErrors({
        form: err instanceof Error ? err.message : "Failed to save action",
      });
    } finally {
      setIsLoading(false);
    }
  }

  const allLeadFieldOptions = ["name", "email", "phone", "company"];

  function toggleLeadField(field: string) {
    setLeadFields((prev) =>
      prev.includes(field)
        ? prev.filter((f) => f !== field)
        : [...prev, field]
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {errors.form && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {errors.form}
        </div>
      )}

      {/* Action Type Selector */}
      <div className="rounded-xl border bg-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Action Type</h3>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ACTION_TYPES.map((at) => (
            <button
              key={at.value}
              type="button"
              onClick={() => setType(at.value)}
              disabled={isLoading}
              className={`flex items-start gap-3 rounded-lg border p-4 text-left transition-colors ${
                type === at.value
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "hover:bg-muted"
              }`}
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted shrink-0">
                {at.icon}
              </div>
              <div>
                <p className="font-medium">{at.label}</p>
                <p className="text-xs text-muted-foreground">
                  {at.description}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Basic Info */}
      <div className="rounded-xl border bg-card p-6">
        <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="action-name">
              Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="action-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Submit Support Ticket"
              disabled={isLoading}
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="action-description">
              Description <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="action-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe when the AI should trigger this action..."
              rows={3}
              disabled={isLoading}
            />
            {errors.description && (
              <p className="text-sm text-red-500">{errors.description}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Switch
              checked={isActive}
              onCheckedChange={setIsActive}
              disabled={isLoading}
            />
            <Label>Active</Label>
          </div>
        </div>
      </div>

      {/* Type-specific Configuration */}
      {type === "CUSTOM_API" && (
        <div className="rounded-xl border bg-card p-6">
          <h3 className="text-lg font-semibold mb-4">API Configuration</h3>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
              <div className="space-y-2">
                <Label htmlFor="endpoint-url">
                  Endpoint URL <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="endpoint-url"
                  value={endpointUrl}
                  onChange={(e) => setEndpointUrl(e.target.value)}
                  placeholder="https://api.example.com/endpoint"
                  disabled={isLoading}
                />
                {errors.endpointUrl && (
                  <p className="text-sm text-red-500">{errors.endpointUrl}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="http-method">HTTP Method</Label>
                <Select
                  value={httpMethod}
                  onValueChange={setHttpMethod}
                  disabled={isLoading}
                >
                  <SelectTrigger id="http-method" className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {HTTP_METHODS.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="headers-json">Headers (JSON)</Label>
              <Textarea
                id="headers-json"
                value={headersJson}
                onChange={(e) => setHeadersJson(e.target.value)}
                placeholder='{"Authorization": "Bearer your-token", "Content-Type": "application/json"}'
                rows={4}
                className="font-mono text-sm"
                disabled={isLoading}
              />
              {errors.headers && (
                <p className="text-sm text-red-500">{errors.headers}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="params-schema-json">
                Parameters Schema (JSON Schema)
              </Label>
              <Textarea
                id="params-schema-json"
                value={paramsSchemaJson}
                onChange={(e) => setParamsSchemaJson(e.target.value)}
                placeholder='{"type": "object", "properties": {"query": {"type": "string", "description": "Search query"}}, "required": ["query"]}'
                rows={6}
                className="font-mono text-sm"
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                Define the parameters the AI will provide when calling this
                action. Uses JSON Schema format.
              </p>
              {errors.paramsSchema && (
                <p className="text-sm text-red-500">{errors.paramsSchema}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {type === "COLLECT_LEAD" && (
        <div className="rounded-xl border bg-card p-6">
          <h3 className="text-lg font-semibold mb-4">Lead Fields</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Select which fields the AI should collect from visitors.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {allLeadFieldOptions.map((field) => (
              <button
                key={field}
                type="button"
                onClick={() => toggleLeadField(field)}
                disabled={isLoading}
                className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                  leadFields.includes(field)
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "hover:bg-muted"
                }`}
              >
                <div
                  className={`flex h-5 w-5 items-center justify-center rounded border transition-colors ${
                    leadFields.includes(field)
                      ? "border-primary bg-primary text-white"
                      : "border-muted-foreground/30"
                  }`}
                >
                  {leadFields.includes(field) && (
                    <svg
                      className="h-3 w-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </div>
                <span className="font-medium capitalize">{field}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {type === "SLACK_NOTIFY" && (
        <div className="rounded-xl border bg-card p-6">
          <h3 className="text-lg font-semibold mb-4">Slack Configuration</h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="webhook-url">
                Webhook URL <span className="text-red-500">*</span>
              </Label>
              <Input
                id="webhook-url"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://hooks.slack.com/services/T00.../B00.../xxx"
                disabled={isLoading}
              />
              {errors.webhookUrl && (
                <p className="text-sm text-red-500">{errors.webhookUrl}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="slack-channel">Channel (optional)</Label>
              <Input
                id="slack-channel"
                value={slackChannel}
                onChange={(e) => setSlackChannel(e.target.value)}
                placeholder="#general"
                disabled={isLoading}
              />
            </div>
          </div>
        </div>
      )}

      {type === "WEB_SEARCH" && (
        <div className="rounded-xl border bg-card p-6">
          <h3 className="text-lg font-semibold mb-4">
            Web Search Configuration
          </h3>
          <div className="space-y-2">
            <Label htmlFor="search-api-key">
              Search API Key (optional)
            </Label>
            <Input
              id="search-api-key"
              type="password"
              value={searchApiKey}
              onChange={(e) => setSearchApiKey(e.target.value)}
              placeholder="Your search provider API key"
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              Provide an API key for a search provider (e.g., SerpAPI, Tavily).
              If not set, a placeholder response will be returned.
            </p>
          </div>
        </div>
      )}

      {type === "CALENDLY" && (
        <div className="rounded-xl border bg-card p-6">
          <h3 className="text-lg font-semibold mb-4">Calendly Configuration</h3>
          <div className="space-y-2">
            <Label htmlFor="calendly-url">
              Calendly URL <span className="text-red-500">*</span>
            </Label>
            <Input
              id="calendly-url"
              value={calendlyUrl}
              onChange={(e) => setCalendlyUrl(e.target.value)}
              placeholder="https://calendly.com/your-username/meeting"
              disabled={isLoading}
            />
            {errors.calendlyUrl && (
              <p className="text-sm text-red-500">{errors.calendlyUrl}</p>
            )}
          </div>
        </div>
      )}

      {type === "CUSTOM_BUTTON" && (
        <div className="rounded-xl border bg-card p-6">
          <h3 className="text-lg font-semibold mb-4">Button Configuration</h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="button-text">
                Button Text <span className="text-red-500">*</span>
              </Label>
              <Input
                id="button-text"
                value={buttonText}
                onChange={(e) => setButtonText(e.target.value)}
                placeholder="Visit our website"
                disabled={isLoading}
              />
              {errors.buttonText && (
                <p className="text-sm text-red-500">{errors.buttonText}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="button-url">
                Button URL <span className="text-red-500">*</span>
              </Label>
              <Input
                id="button-url"
                value={buttonUrl}
                onChange={(e) => setButtonUrl(e.target.value)}
                placeholder="https://example.com"
                disabled={isLoading}
              />
              {errors.buttonUrl && (
                <p className="text-sm text-red-500">{errors.buttonUrl}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="button-target">Target</Label>
              <Select
                value={buttonTarget}
                onValueChange={setButtonTarget}
                disabled={isLoading}
              >
                <SelectTrigger id="button-target">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_blank">New Tab</SelectItem>
                  <SelectItem value="_self">Same Tab</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}

      {/* Submit */}
      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => router.push(`/agents/${agentId}/actions`)}
          disabled={isLoading}
          className="inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium hover:bg-muted disabled:opacity-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
          {isEditing ? "Save Changes" : "Create Action"}
        </button>
      </div>
    </form>
  );
}
