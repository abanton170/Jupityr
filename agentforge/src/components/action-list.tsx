"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Globe,
  Users,
  Bell,
  Search,
  Calendar,
  MousePointer,
  Pencil,
  Trash2,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface ActionInfo {
  id: string;
  name: string;
  description: string;
  type: string;
  isActive: boolean;
  createdAt: string;
}

interface ActionListProps {
  agentId: string;
  actions: ActionInfo[];
}

const TYPE_META: Record<
  string,
  { label: string; icon: React.ReactNode; color: string }
> = {
  CUSTOM_API: {
    label: "Custom API",
    icon: <Globe className="h-4 w-4" />,
    color: "bg-blue-100 text-blue-700",
  },
  COLLECT_LEAD: {
    label: "Collect Lead",
    icon: <Users className="h-4 w-4" />,
    color: "bg-green-100 text-green-700",
  },
  SLACK_NOTIFY: {
    label: "Slack Notify",
    icon: <Bell className="h-4 w-4" />,
    color: "bg-purple-100 text-purple-700",
  },
  WEB_SEARCH: {
    label: "Web Search",
    icon: <Search className="h-4 w-4" />,
    color: "bg-orange-100 text-orange-700",
  },
  CALENDLY: {
    label: "Calendly",
    icon: <Calendar className="h-4 w-4" />,
    color: "bg-cyan-100 text-cyan-700",
  },
  CUSTOM_BUTTON: {
    label: "Custom Button",
    icon: <MousePointer className="h-4 w-4" />,
    color: "bg-pink-100 text-pink-700",
  },
};

export function ActionList({ agentId, actions }: ActionListProps) {
  const router = useRouter();
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleToggle(actionId: string, currentActive: boolean) {
    setTogglingIds((prev) => new Set(prev).add(actionId));
    try {
      const res = await fetch(
        `/api/agents/${agentId}/actions/${actionId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive: !currentActive }),
        }
      );
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Failed to update action");
      }
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to toggle action");
    } finally {
      setTogglingIds((prev) => {
        const next = new Set(prev);
        next.delete(actionId);
        return next;
      });
    }
  }

  async function handleDelete(actionId: string) {
    if (!confirm("Are you sure you want to delete this action?")) return;

    setDeletingId(actionId);
    try {
      const res = await fetch(
        `/api/agents/${agentId}/actions/${actionId}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Failed to delete action");
      }
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete action");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-3">
      {actions.map((action) => {
        const meta = TYPE_META[action.type] ?? {
          label: action.type,
          icon: <Globe className="h-4 w-4" />,
          color: "bg-gray-100 text-gray-700",
        };

        return (
          <div
            key={action.id}
            className="flex items-center justify-between rounded-xl border bg-card p-4"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted shrink-0">
                {meta.icon}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium truncate">{action.name}</p>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium shrink-0 ${meta.color}`}
                  >
                    {meta.label}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground truncate">
                  {action.description}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0 ml-4">
              <Switch
                checked={action.isActive}
                onCheckedChange={() =>
                  handleToggle(action.id, action.isActive)
                }
                disabled={togglingIds.has(action.id)}
              />
              <Link
                href={`/agents/${agentId}/actions/${action.id}/edit`}
                className="inline-flex items-center justify-center rounded-md border p-2 hover:bg-muted transition-colors"
              >
                <Pencil className="h-4 w-4" />
              </Link>
              <button
                onClick={() => handleDelete(action.id)}
                disabled={deletingId === action.id}
                className="inline-flex items-center justify-center rounded-md border p-2 hover:bg-red-50 hover:border-red-200 hover:text-red-600 disabled:opacity-50 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
