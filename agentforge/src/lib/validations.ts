import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const apiKeysSchema = z.object({
  openai: z.string().optional(),
  anthropic: z.string().optional(),
  google: z.string().optional(),
});

export const agentCreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  systemPrompt: z.string().min(1, "System prompt is required"),
  model: z.string().min(1, "Model is required"),
  temperature: z.number().min(0).max(2).default(0.7),
  maxTokens: z.number().int().min(1).max(4096).default(1024),
  welcomeMessage: z.string().optional(),
  suggestedQuestions: z.array(z.string()).optional(),
  primaryColor: z.string().optional(),
  position: z
    .enum(["bottom-right", "bottom-left", "top-right", "top-left"])
    .optional(),
});

export const actionCreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
  type: z.enum([
    "CUSTOM_API",
    "CALENDLY",
    "SLACK_NOTIFY",
    "WEB_SEARCH",
    "COLLECT_LEAD",
    "CUSTOM_BUTTON",
  ]),
  endpointUrl: z.string().optional(),
  httpMethod: z
    .enum(["GET", "POST", "PUT", "DELETE"])
    .optional()
    .default("POST"),
  headers: z.record(z.string(), z.string()).optional(),
  paramsSchema: z.record(z.string(), z.unknown()).optional(),
  config: z.record(z.string(), z.unknown()).optional(),
  isActive: z.boolean().optional().default(true),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ApiKeysInput = z.infer<typeof apiKeysSchema>;
export type AgentCreateInput = z.infer<typeof agentCreateSchema>;
export type ActionCreateInput = z.infer<typeof actionCreateSchema>;
