"use client";

import { useState } from "react";
import { Eye, EyeOff, Check, Loader2, X } from "lucide-react";

interface ApiKeySettingsProps {
  maskedKeys: {
    openai: string;
    anthropic: string;
    google: string;
  };
  hasKeys: {
    openai: boolean;
    anthropic: boolean;
    google: boolean;
  };
}

type Provider = "openai" | "anthropic" | "google";

const providers: { key: Provider; label: string; placeholder: string }[] = [
  {
    key: "openai",
    label: "OpenAI",
    placeholder: "sk-...",
  },
  {
    key: "anthropic",
    label: "Anthropic",
    placeholder: "sk-ant-...",
  },
  {
    key: "google",
    label: "Google AI",
    placeholder: "AIza...",
  },
];

export function ApiKeySettings({ maskedKeys, hasKeys }: ApiKeySettingsProps) {
  const [keys, setKeys] = useState<Record<Provider, string>>({
    openai: "",
    anthropic: "",
    google: "",
  });
  const [showKeys, setShowKeys] = useState<Record<Provider, boolean>>({
    openai: false,
    anthropic: false,
    google: false,
  });
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<Provider | null>(null);
  const [testResults, setTestResults] = useState<
    Record<Provider, "success" | "error" | null>
  >({
    openai: null,
    anthropic: null,
    google: null,
  });
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    try {
      const payload: Record<string, string> = {};
      for (const provider of providers) {
        if (keys[provider.key]) {
          payload[provider.key] = keys[provider.key];
        }
      }

      const res = await fetch("/api/settings/api-keys", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save keys");
      }

      setMessage({ type: "success", text: "API keys saved successfully." });
      setKeys({ openai: "", anthropic: "", google: "" });
      // Reload to refresh masked keys
      window.location.reload();
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to save keys",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleTest(provider: Provider) {
    const key = keys[provider];
    if (!key && !hasKeys[provider]) return;

    setTesting(provider);
    setTestResults((prev) => ({ ...prev, [provider]: null }));
    try {
      const res = await fetch("/api/settings/api-keys/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          apiKey: key || undefined,
        }),
      });

      if (res.ok) {
        setTestResults((prev) => ({ ...prev, [provider]: "success" }));
      } else {
        setTestResults((prev) => ({ ...prev, [provider]: "error" }));
      }
    } catch {
      setTestResults((prev) => ({ ...prev, [provider]: "error" }));
    } finally {
      setTesting(null);
    }
  }

  return (
    <div className="mt-6 space-y-6">
      {providers.map((provider) => (
        <div key={provider.key} className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">{provider.label}</label>
            {hasKeys[provider.key] && !keys[provider.key] && (
              <span className="flex items-center gap-1 text-xs text-green-600">
                <Check className="h-3 w-3" /> Configured
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type={showKeys[provider.key] ? "text" : "password"}
                value={keys[provider.key]}
                onChange={(e) =>
                  setKeys((prev) => ({
                    ...prev,
                    [provider.key]: e.target.value,
                  }))
                }
                placeholder={
                  hasKeys[provider.key]
                    ? maskedKeys[provider.key]
                    : provider.placeholder
                }
                className="w-full rounded-lg border bg-background px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                type="button"
                onClick={() =>
                  setShowKeys((prev) => ({
                    ...prev,
                    [provider.key]: !prev[provider.key],
                  }))
                }
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showKeys[provider.key] ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            <button
              type="button"
              onClick={() => handleTest(provider.key)}
              disabled={testing !== null || (!keys[provider.key] && !hasKeys[provider.key])}
              className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
            >
              {testing === provider.key ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : testResults[provider.key] === "success" ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : testResults[provider.key] === "error" ? (
                <X className="h-4 w-4 text-red-600" />
              ) : null}
              Test
            </button>
          </div>
        </div>
      ))}

      {message && (
        <p
          className={`text-sm ${
            message.type === "success" ? "text-green-600" : "text-red-600"
          }`}
        >
          {message.text}
        </p>
      )}

      <button
        onClick={handleSave}
        disabled={
          saving || (!keys.openai && !keys.anthropic && !keys.google)
        }
        className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {saving && <Loader2 className="h-4 w-4 animate-spin" />}
        Save API Keys
      </button>
    </div>
  );
}
