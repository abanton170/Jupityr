import { type Action } from "@prisma/client";
import type OpenAI from "openai";

/**
 * Convert database actions to OpenAI function calling format.
 */
export function actionsToOpenAITools(
  actions: Action[]
): OpenAI.ChatCompletionTool[] {
  return actions
    .filter((a) => a.isActive)
    .map((action) => ({
      type: "function" as const,
      function: {
        name: action.id, // Use ID as function name for reliable mapping
        description: `${action.name}: ${action.description}`,
        parameters: (action.paramsSchema as Record<string, unknown>) || {
          type: "object",
          properties: {},
        },
      },
    }));
}

/**
 * Convert database actions to Anthropic tool format.
 */
export function actionsToAnthropicTools(actions: Action[]) {
  return actions
    .filter((a) => a.isActive)
    .map((action) => ({
      name: action.id,
      description: `${action.name}: ${action.description}`,
      input_schema: (action.paramsSchema as Record<string, unknown>) || {
        type: "object" as const,
        properties: {},
      },
    }));
}

/**
 * Convert database actions to Google function declarations.
 */
export function actionsToGoogleTools(actions: Action[]) {
  return [
    {
      functionDeclarations: actions
        .filter((a) => a.isActive)
        .map((action) => ({
          name: action.id,
          description: `${action.name}: ${action.description}`,
          parameters: (action.paramsSchema as Record<string, unknown>) || {
            type: "OBJECT",
            properties: {},
          },
        })),
    },
  ];
}

/**
 * Look up an action from a list by its ID (used as function name in tool calls).
 */
export function findActionById(
  actions: Action[],
  actionId: string
): Action | undefined {
  return actions.find((a) => a.id === actionId);
}
