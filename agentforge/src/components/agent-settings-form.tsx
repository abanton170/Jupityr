"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Bot,
  Loader2,
  Plus,
  Trash2,
  Sparkles,
  MessageSquare,
  Palette,
  Settings2,
} from "lucide-react";

const MODELS = [
  { value: "gpt-4o", label: "GPT-4o", provider: "OpenAI" },
  { value: "gpt-4o-mini", label: "GPT-4o Mini", provider: "OpenAI" },
  {
    value: "claude-3-5-sonnet-20241022",
    label: "Claude 3.5 Sonnet",
    provider: "Anthropic",
  },
  {
    value: "claude-3-haiku-20240307",
    label: "Claude 3 Haiku",
    provider: "Anthropic",
  },
  { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash", provider: "Google" },
];

export interface AgentFormData {
  name: string;
  description: string;
  systemPrompt: string;
  model: string;
  temperature: number;
  maxTokens: number;
  welcomeMessage: string;
  suggestedQuestions: string[];
  primaryColor: string;
  position: string;
}

interface AgentSettingsFormProps {
  agent?: {
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
  };
  onSubmit: (data: AgentFormData) => Promise<void>;
  isLoading: boolean;
}

export function AgentSettingsForm({
  agent,
  onSubmit,
  isLoading,
}: AgentSettingsFormProps) {
  const [name, setName] = useState(agent?.name ?? "");
  const [description, setDescription] = useState(agent?.description ?? "");
  const [systemPrompt, setSystemPrompt] = useState(
    agent?.systemPrompt ?? ""
  );
  const [model, setModel] = useState(agent?.model ?? "gpt-4o-mini");
  const [temperature, setTemperature] = useState(agent?.temperature ?? 0.7);
  const [maxTokens, setMaxTokens] = useState(agent?.maxTokens ?? 1024);
  const [welcomeMessage, setWelcomeMessage] = useState(
    agent?.welcomeMessage ?? ""
  );
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>(
    agent?.suggestedQuestions ?? []
  );
  const [primaryColor, setPrimaryColor] = useState(
    agent?.primaryColor ?? "#6366f1"
  );
  const [position, setPosition] = useState(
    agent?.position ?? "bottom-right"
  );
  const [newQuestion, setNewQuestion] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) {
      newErrors.name = "Name is required";
    }
    if (!systemPrompt.trim()) {
      newErrors.systemPrompt = "System prompt is required";
    }
    if (!model) {
      newErrors.model = "Model is required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleAddQuestion() {
    const trimmed = newQuestion.trim();
    if (trimmed && !suggestedQuestions.includes(trimmed)) {
      setSuggestedQuestions([...suggestedQuestions, trimmed]);
      setNewQuestion("");
    }
  }

  function handleRemoveQuestion(index: number) {
    setSuggestedQuestions(suggestedQuestions.filter((_, i) => i !== index));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddQuestion();
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    await onSubmit({
      name: name.trim(),
      description: description.trim(),
      systemPrompt: systemPrompt.trim(),
      model,
      temperature,
      maxTokens,
      welcomeMessage: welcomeMessage.trim(),
      suggestedQuestions,
      primaryColor,
      position,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Basic Information */}
      <div className="rounded-xl border bg-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Bot className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Basic Information</h3>
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">
              Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Support Agent"
              disabled={isLoading}
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A brief description of what this agent does..."
              rows={3}
              disabled={isLoading}
            />
          </div>
        </div>
      </div>

      {/* AI Configuration */}
      <div className="rounded-xl border bg-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">AI Configuration</h3>
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="systemPrompt">
              System Prompt <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="systemPrompt"
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="You are a helpful customer support agent for [Company Name]. You help customers with questions about our products, pricing, and policies. Always be friendly and professional."
              rows={6}
              disabled={isLoading}
            />
            {errors.systemPrompt && (
              <p className="text-sm text-red-500">{errors.systemPrompt}</p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="model">
                Model <span className="text-red-500">*</span>
              </Label>
              <Select
                value={model}
                onValueChange={setModel}
                disabled={isLoading}
              >
                <SelectTrigger id="model">
                  <SelectValue placeholder="Select a model" />
                </SelectTrigger>
                <SelectContent>
                  {MODELS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      <span className="flex items-center gap-2">
                        {m.label}
                        <span className="text-xs text-muted-foreground">
                          ({m.provider})
                        </span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.model && (
                <p className="text-sm text-red-500">{errors.model}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxTokens">Max Tokens</Label>
              <Input
                id="maxTokens"
                type="number"
                min={1}
                max={4096}
                value={maxTokens}
                onChange={(e) =>
                  setMaxTokens(
                    Math.min(4096, Math.max(1, Number(e.target.value) || 1))
                  )
                }
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                Maximum response length (1-4096)
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="temperature">Temperature</Label>
              <span className="text-sm font-medium tabular-nums">
                {temperature.toFixed(1)}
              </span>
            </div>
            <Slider
              id="temperature"
              min={0}
              max={2}
              step={0.1}
              value={temperature}
              onValueChange={(val) => setTemperature(val)}
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              Lower values produce more focused responses. Higher values are more
              creative.
            </p>
          </div>
        </div>
      </div>

      {/* Chat Widget Settings */}
      <div className="rounded-xl border bg-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Chat Widget</h3>
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="welcomeMessage">Welcome Message</Label>
            <Input
              id="welcomeMessage"
              value={welcomeMessage}
              onChange={(e) => setWelcomeMessage(e.target.value)}
              placeholder="Hi! How can I help you today?"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label>Suggested Questions</Label>
            <p className="text-xs text-muted-foreground">
              Add questions that visitors will see as quick-reply buttons.
            </p>
            <div className="space-y-2">
              {suggestedQuestions.map((q, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2"
                >
                  <span className="flex-1 text-sm">{q}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveQuestion(index)}
                    className="text-muted-foreground hover:text-red-500 transition-colors"
                    disabled={isLoading}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <div className="flex gap-2">
                <Input
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a suggested question..."
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={handleAddQuestion}
                  disabled={isLoading || !newQuestion.trim()}
                  className="inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Add
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Appearance */}
      <div className="rounded-xl border bg-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Palette className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Appearance</h3>
        </div>
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="primaryColor">Primary Color</Label>
              <div className="flex items-center gap-3">
                <input
                  id="primaryColor"
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="h-9 w-12 cursor-pointer rounded-md border border-input bg-transparent p-0.5"
                  disabled={isLoading}
                />
                <Input
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="flex-1 font-mono text-sm"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="position">Widget Position</Label>
              <Select
                value={position}
                onValueChange={setPosition}
                disabled={isLoading}
              >
                <SelectTrigger id="position">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bottom-right">Bottom Right</SelectItem>
                  <SelectItem value="bottom-left">Bottom Left</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Preview */}
          <div className="mt-4 rounded-lg border bg-muted/30 p-4">
            <p className="text-xs font-medium text-muted-foreground mb-3">
              Preview
            </p>
            <div className="flex items-center gap-3">
              <div
                className="flex h-11 w-11 items-center justify-center rounded-full text-white shadow-lg"
                style={{ backgroundColor: primaryColor }}
              >
                <MessageSquare className="h-5 w-5" />
              </div>
              <div className="rounded-lg border bg-background p-3 shadow-sm">
                <p className="text-sm">
                  {welcomeMessage || "Hi! How can I help you today?"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Submit */}
      <div className="flex items-center justify-end gap-3">
        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
          {agent ? "Save Changes" : "Create Agent"}
        </button>
      </div>
    </form>
  );
}
