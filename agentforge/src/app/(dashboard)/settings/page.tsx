import { requireAuth } from "@/lib/auth-utils";
import { ApiKeySettings } from "@/components/api-key-settings";
import { decryptApiKeys, type ApiKeys } from "@/lib/encryption";

export default async function SettingsPage() {
  const user = await requireAuth();

  let savedKeys: ApiKeys = {};
  if (user.encryptedApiKeys) {
    try {
      savedKeys = decryptApiKeys(user.encryptedApiKeys);
    } catch {
      // If decryption fails, start fresh
    }
  }

  // Mask keys for display
  const maskedKeys = {
    openai: savedKeys.openai ? maskKey(savedKeys.openai) : "",
    anthropic: savedKeys.anthropic ? maskKey(savedKeys.anthropic) : "",
    google: savedKeys.google ? maskKey(savedKeys.google) : "",
  };

  const hasKeys = {
    openai: !!savedKeys.openai,
    anthropic: !!savedKeys.anthropic,
    google: !!savedKeys.google,
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account settings and API keys.
        </p>
      </div>

      {/* Profile Section */}
      <div className="rounded-xl border bg-card p-6">
        <h2 className="text-lg font-semibold">Profile</h2>
        <p className="text-sm text-muted-foreground">
          Your account information.
        </p>
        <div className="mt-4 space-y-4">
          <div>
            <label className="text-sm font-medium">Name</label>
            <p className="mt-1 text-sm text-muted-foreground">
              {user.name || "Not set"}
            </p>
          </div>
          <div>
            <label className="text-sm font-medium">Email</label>
            <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>
          </div>
          <div>
            <label className="text-sm font-medium">Plan</label>
            <p className="mt-1 text-sm text-muted-foreground">
              {user.planTier}
            </p>
          </div>
        </div>
      </div>

      {/* API Keys Section */}
      <div className="rounded-xl border bg-card p-6">
        <h2 className="text-lg font-semibold">API Keys</h2>
        <p className="text-sm text-muted-foreground">
          Provide your own API keys to power your AI agents. Keys are encrypted
          at rest using AES-256-GCM.
        </p>
        <ApiKeySettings maskedKeys={maskedKeys} hasKeys={hasKeys} />
      </div>
    </div>
  );
}

function maskKey(key: string): string {
  if (key.length <= 8) return "••••••••";
  return "••••••••" + key.slice(-4);
}
