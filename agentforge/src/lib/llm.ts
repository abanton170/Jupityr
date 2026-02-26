import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI, type Content } from "@google/generative-ai";
import { type ApiKeys } from "./encryption";

export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function* streamLLM(
  model: string,
  messages: LLMMessage[],
  apiKeys: ApiKeys,
  options?: { temperature?: number; maxTokens?: number }
): AsyncGenerator<{ text: string; tokensUsed?: number }> {
  const temperature = options?.temperature ?? 0.7;
  const maxTokens = options?.maxTokens ?? 1024;

  if (model.startsWith("gpt")) {
    yield* streamOpenAI(model, messages, apiKeys, temperature, maxTokens);
  } else if (model.startsWith("claude")) {
    yield* streamAnthropic(model, messages, apiKeys, temperature, maxTokens);
  } else if (model.startsWith("gemini")) {
    yield* streamGoogle(model, messages, apiKeys, temperature, maxTokens);
  } else {
    throw new Error(
      `Unsupported model: "${model}". Supported prefixes: gpt, claude, gemini.`
    );
  }
}

async function* streamOpenAI(
  model: string,
  messages: LLMMessage[],
  apiKeys: ApiKeys,
  temperature: number,
  maxTokens: number
): AsyncGenerator<{ text: string; tokensUsed?: number }> {
  if (!apiKeys.openai) {
    throw new Error(
      "OpenAI API key is required for GPT models. Please add your key in Settings."
    );
  }

  const client = new OpenAI({ apiKey: apiKeys.openai });

  try {
    const stream = await client.chat.completions.create({
      model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      temperature,
      max_tokens: maxTokens,
      stream: true,
      stream_options: { include_usage: true },
    });

    let tokensUsed = 0;

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        yield { text: delta };
      }
      if (chunk.usage) {
        tokensUsed = chunk.usage.total_tokens;
      }
    }

    if (tokensUsed > 0) {
      yield { text: "", tokensUsed };
    }
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string };
    if (err.status === 401) {
      throw new Error("Invalid OpenAI API key. Please check your key in Settings.");
    }
    if (err.status === 429) {
      throw new Error("OpenAI rate limit exceeded. Please try again in a moment.");
    }
    if (err.status === 404) {
      throw new Error(
        `Model "${model}" is not available. Please check the model name or your API access.`
      );
    }
    throw new Error(`OpenAI error: ${err.message || "Unknown error"}`);
  }
}

async function* streamAnthropic(
  model: string,
  messages: LLMMessage[],
  apiKeys: ApiKeys,
  temperature: number,
  maxTokens: number
): AsyncGenerator<{ text: string; tokensUsed?: number }> {
  if (!apiKeys.anthropic) {
    throw new Error(
      "Anthropic API key is required for Claude models. Please add your key in Settings."
    );
  }

  const client = new Anthropic({ apiKey: apiKeys.anthropic });

  // Anthropic requires system as a separate param, not in messages
  const systemMessage = messages.find((m) => m.role === "system");
  const chatMessages = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

  try {
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
    const tokensUsed =
      finalMessage.usage.input_tokens + finalMessage.usage.output_tokens;
    if (tokensUsed > 0) {
      yield { text: "", tokensUsed };
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

async function* streamGoogle(
  model: string,
  messages: LLMMessage[],
  apiKeys: ApiKeys,
  temperature: number,
  maxTokens: number
): AsyncGenerator<{ text: string; tokensUsed?: number }> {
  if (!apiKeys.google) {
    throw new Error(
      "Google API key is required for Gemini models. Please add your key in Settings."
    );
  }

  const genAI = new GoogleGenerativeAI(apiKeys.google);

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
    });

    // For streaming, we send the last user message via generateContentStream
    // while providing history for context
    const history = contents.slice(0, -1);
    const lastMessage = contents[contents.length - 1];

    const chat = generativeModel.startChat({ history });
    const result = await chat.sendMessageStream(lastMessage.parts);

    let totalText = "";
    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) {
        totalText += text;
        yield { text };
      }
    }

    // Google SDK doesn't always provide token counts in streaming,
    // estimate based on response length
    const response = await result.response;
    const usage = response.usageMetadata;
    if (usage) {
      const tokensUsed =
        (usage.promptTokenCount ?? 0) + (usage.candidatesTokenCount ?? 0);
      if (tokensUsed > 0) {
        yield { text: "", tokensUsed };
      }
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
