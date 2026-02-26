import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI, type Content } from "@google/generative-ai";
import { type Action } from "@prisma/client";
import { type ApiKeys } from "./encryption";
import { type LLMMessage } from "./llm";
import {
  actionsToOpenAITools,
  actionsToAnthropicTools,
  actionsToGoogleTools,
  findActionById,
} from "./actions";
import { executeAction } from "./action-executor";

export interface LLMActionChunk {
  text?: string;
  toolCall?: { actionId: string; params: Record<string, unknown> };
  toolResult?: { actionId: string; result: unknown };
  tokensUsed?: number;
}

/**
 * Stream LLM responses with function/tool calling support.
 * When the model requests a tool call, execute the action and feed the result back.
 */
export async function* streamLLMWithActions(
  model: string,
  messages: LLMMessage[],
  apiKeys: ApiKeys,
  actions: Action[],
  options?: { temperature?: number; maxTokens?: number }
): AsyncGenerator<LLMActionChunk> {
  const activeActions = actions.filter((a) => a.isActive);

  // If no active actions, fall back to basic streaming without tools
  if (activeActions.length === 0) {
    // Import and use the base streamLLM
    const { streamLLM } = await import("./llm");
    for await (const chunk of streamLLM(model, messages, apiKeys, options)) {
      yield { text: chunk.text, tokensUsed: chunk.tokensUsed };
    }
    return;
  }

  const temperature = options?.temperature ?? 0.7;
  const maxTokens = options?.maxTokens ?? 1024;

  if (model.startsWith("gpt")) {
    yield* streamOpenAIWithActions(
      model,
      messages,
      apiKeys,
      activeActions,
      temperature,
      maxTokens
    );
  } else if (model.startsWith("claude")) {
    yield* streamAnthropicWithActions(
      model,
      messages,
      apiKeys,
      activeActions,
      temperature,
      maxTokens
    );
  } else if (model.startsWith("gemini")) {
    yield* streamGoogleWithActions(
      model,
      messages,
      apiKeys,
      activeActions,
      temperature,
      maxTokens
    );
  } else {
    throw new Error(
      `Unsupported model: "${model}". Supported prefixes: gpt, claude, gemini.`
    );
  }
}

/**
 * OpenAI streaming with tool calling.
 */
async function* streamOpenAIWithActions(
  model: string,
  messages: LLMMessage[],
  apiKeys: ApiKeys,
  actions: Action[],
  temperature: number,
  maxTokens: number
): AsyncGenerator<LLMActionChunk> {
  if (!apiKeys.openai) {
    throw new Error(
      "OpenAI API key is required for GPT models. Please add your key in Settings."
    );
  }

  const client = new OpenAI({ apiKey: apiKeys.openai });
  const tools = actionsToOpenAITools(actions);

  const openaiMessages: OpenAI.ChatCompletionMessageParam[] = messages.map(
    (m) => ({ role: m.role, content: m.content })
  );

  try {
    // First call with tools
    const response = await client.chat.completions.create({
      model,
      messages: openaiMessages,
      temperature,
      max_tokens: maxTokens,
      tools,
      tool_choice: "auto",
    });

    const choice = response.choices[0];
    let totalTokens = response.usage?.total_tokens ?? 0;

    // Check if the model wants to call a tool
    if (choice.finish_reason === "tool_calls" && choice.message.tool_calls) {
      const toolCalls = choice.message.tool_calls;

      // Add the assistant message with tool calls to conversation
      openaiMessages.push(choice.message);

      // Process each tool call
      for (const toolCall of toolCalls) {
        const fn = toolCall as unknown as { function: { name: string; arguments: string }; id: string; type: string };
        const actionId = fn.function.name;
        let params: Record<string, unknown> = {};
        try {
          params = JSON.parse(fn.function.arguments || "{}");
        } catch {
          // If parsing fails, use empty params
        }

        yield { toolCall: { actionId, params } };

        // Execute the action
        const action = findActionById(actions, actionId);
        if (action) {
          const result = await executeAction(action, params);
          yield { toolResult: { actionId, result } };

          // Add tool result to messages
          openaiMessages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify(result),
          });
        } else {
          openaiMessages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify({
              success: false,
              error: "Action not found",
            }),
          });
        }
      }

      // Stream the final response after tool results
      const stream = await client.chat.completions.create({
        model,
        messages: openaiMessages,
        temperature,
        max_tokens: maxTokens,
        stream: true,
        stream_options: { include_usage: true },
      });

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content;
        if (delta) {
          yield { text: delta };
        }
        if (chunk.usage) {
          totalTokens += chunk.usage.total_tokens;
        }
      }
    } else {
      // No tool call, just yield the text response
      const content = choice.message.content;
      if (content) {
        yield { text: content };
      }
    }

    if (totalTokens > 0) {
      yield { text: "", tokensUsed: totalTokens };
    }
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string };
    if (err.status === 401) {
      throw new Error(
        "Invalid OpenAI API key. Please check your key in Settings."
      );
    }
    if (err.status === 429) {
      throw new Error(
        "OpenAI rate limit exceeded. Please try again in a moment."
      );
    }
    if (err.status === 404) {
      throw new Error(
        `Model "${model}" is not available. Please check the model name or your API access.`
      );
    }
    throw new Error(`OpenAI error: ${err.message || "Unknown error"}`);
  }
}

/**
 * Anthropic streaming with tool calling.
 */
async function* streamAnthropicWithActions(
  model: string,
  messages: LLMMessage[],
  apiKeys: ApiKeys,
  actions: Action[],
  temperature: number,
  maxTokens: number
): AsyncGenerator<LLMActionChunk> {
  if (!apiKeys.anthropic) {
    throw new Error(
      "Anthropic API key is required for Claude models. Please add your key in Settings."
    );
  }

  const client = new Anthropic({ apiKey: apiKeys.anthropic });
  const tools = actionsToAnthropicTools(actions);

  // Anthropic requires system as a separate param
  const systemMessage = messages.find((m) => m.role === "system");
  const chatMessages: Anthropic.MessageParam[] = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

  try {
    // First call with tools
    const response = await client.messages.create({
      model,
      system: systemMessage?.content || "",
      messages: chatMessages,
      temperature,
      max_tokens: maxTokens,
      tools: tools as Anthropic.Tool[],
    });

    let totalTokens =
      response.usage.input_tokens + response.usage.output_tokens;

    // Check for tool use in the response
    const toolUseBlocks = response.content.filter(
      (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
    );
    const textBlocks = response.content.filter(
      (block): block is Anthropic.TextBlock => block.type === "text"
    );

    // Yield any text that came before tool calls
    for (const block of textBlocks) {
      if (block.text) {
        yield { text: block.text };
      }
    }

    if (toolUseBlocks.length > 0 && response.stop_reason === "tool_use") {
      // Add assistant response to messages
      chatMessages.push({
        role: "assistant",
        content: response.content,
      });

      // Process tool calls and build tool results
      const toolResults: Anthropic.ToolResultBlockParam[] = [];

      for (const toolUse of toolUseBlocks) {
        const actionId = toolUse.name;
        const params = (toolUse.input as Record<string, unknown>) || {};

        yield { toolCall: { actionId, params } };

        const action = findActionById(actions, actionId);
        if (action) {
          const result = await executeAction(action, params);
          yield { toolResult: { actionId, result } };

          toolResults.push({
            type: "tool_result",
            tool_use_id: toolUse.id,
            content: JSON.stringify(result),
          });
        } else {
          toolResults.push({
            type: "tool_result",
            tool_use_id: toolUse.id,
            content: JSON.stringify({
              success: false,
              error: "Action not found",
            }),
          });
        }
      }

      // Add tool results to messages
      chatMessages.push({
        role: "user",
        content: toolResults,
      });

      // Stream the final response
      const stream = client.messages.stream({
        model,
        system: systemMessage?.content || "",
        messages: chatMessages,
        temperature,
        max_tokens: maxTokens,
      });

      for await (const event of stream) {
        if (
          event.type === "content_block_delta" &&
          event.delta.type === "text_delta"
        ) {
          yield { text: event.delta.text };
        }
      }

      const finalMessage = await stream.finalMessage();
      totalTokens +=
        finalMessage.usage.input_tokens + finalMessage.usage.output_tokens;
    }

    if (totalTokens > 0) {
      yield { text: "", tokensUsed: totalTokens };
    }
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string };
    if (err.status === 401) {
      throw new Error(
        "Invalid Anthropic API key. Please check your key in Settings."
      );
    }
    if (err.status === 429) {
      throw new Error(
        "Anthropic rate limit exceeded. Please try again in a moment."
      );
    }
    if (err.status === 404) {
      throw new Error(
        `Model "${model}" is not available. Please check the model name or your API access.`
      );
    }
    throw new Error(`Anthropic error: ${err.message || "Unknown error"}`);
  }
}

/**
 * Google streaming with function calling.
 */
async function* streamGoogleWithActions(
  model: string,
  messages: LLMMessage[],
  apiKeys: ApiKeys,
  actions: Action[],
  temperature: number,
  maxTokens: number
): AsyncGenerator<LLMActionChunk> {
  if (!apiKeys.google) {
    throw new Error(
      "Google API key is required for Gemini models. Please add your key in Settings."
    );
  }

  const genAI = new GoogleGenerativeAI(apiKeys.google);
  const tools = actionsToGoogleTools(actions);

  // Extract system instruction
  const systemMessage = messages.find((m) => m.role === "system");
  const chatMessages = messages.filter((m) => m.role !== "system");

  // Map messages to Google's Content format
  const contents: Content[] = chatMessages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  try {
    const generativeModel = genAI.getGenerativeModel({
      model,
      systemInstruction: systemMessage?.content
        ? { role: "system", parts: [{ text: systemMessage.content }] }
        : undefined,
      generationConfig: {
        temperature,
        maxOutputTokens: maxTokens,
      },
      tools: tools as Parameters<typeof genAI.getGenerativeModel>[0]["tools"],
    });

    const history = contents.slice(0, -1);
    const lastMessage = contents[contents.length - 1];

    const chat = generativeModel.startChat({ history });
    const result = await chat.sendMessage(lastMessage.parts);
    const response = result.response;

    let totalTokens = 0;
    const usage = response.usageMetadata;
    if (usage) {
      totalTokens =
        (usage.promptTokenCount ?? 0) + (usage.candidatesTokenCount ?? 0);
    }

    // Check for function calls
    const candidate = response.candidates?.[0];
    const functionCalls = candidate?.content?.parts?.filter(
      (part) => part.functionCall
    );

    if (functionCalls && functionCalls.length > 0) {
      // Process function calls
      const functionResponses = [];

      for (const part of functionCalls) {
        if (!part.functionCall) continue;
        const actionId = part.functionCall.name;
        const params = (part.functionCall.args as Record<string, unknown>) || {};

        yield { toolCall: { actionId, params } };

        const action = findActionById(actions, actionId);
        if (action) {
          const actionResult = await executeAction(action, params);
          yield { toolResult: { actionId, result: actionResult } };

          functionResponses.push({
            functionResponse: {
              name: actionId,
              response: actionResult,
            },
          });
        } else {
          functionResponses.push({
            functionResponse: {
              name: actionId,
              response: { success: false, error: "Action not found" },
            },
          });
        }
      }

      // Send function results back and stream the final response
      const finalResult = await chat.sendMessageStream(functionResponses);

      for await (const chunk of finalResult.stream) {
        const text = chunk.text();
        if (text) {
          yield { text };
        }
      }

      const finalResponse = await finalResult.response;
      const finalUsage = finalResponse.usageMetadata;
      if (finalUsage) {
        totalTokens +=
          (finalUsage.promptTokenCount ?? 0) +
          (finalUsage.candidatesTokenCount ?? 0);
      }
    } else {
      // No function call - yield the text response
      const text = response.text();
      if (text) {
        yield { text };
      }
    }

    if (totalTokens > 0) {
      yield { text: "", tokensUsed: totalTokens };
    }
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string };
    const message = err.message || "Unknown error";
    if (
      message.includes("API_KEY_INVALID") ||
      message.includes("PERMISSION_DENIED")
    ) {
      throw new Error(
        "Invalid Google API key. Please check your key in Settings."
      );
    }
    if (message.includes("RESOURCE_EXHAUSTED")) {
      throw new Error(
        "Google API rate limit exceeded. Please try again in a moment."
      );
    }
    if (message.includes("not found") || message.includes("NOT_FOUND")) {
      throw new Error(
        `Model "${model}" is not available. Please check the model name or your API access.`
      );
    }
    throw new Error(`Google AI error: ${message}`);
  }
}
