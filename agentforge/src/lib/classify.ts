import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/db";
import { type ApiKeys } from "@/lib/encryption";

const CLASSIFY_PROMPT = `Analyze this conversation and return ONLY valid JSON with exactly these fields:
- "sentiment": one of "positive", "negative", or "neutral"
- "topic": a 1-3 word topic describing what the conversation is about
- "summary": a single sentence summary of the conversation

Return ONLY the JSON object, no markdown, no code fences.`;

export async function classifyConversation(
  conversationId: string,
  apiKeys: ApiKeys
): Promise<{ sentiment: string; topic: string; summary: string }> {
  // Load conversation messages
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
        select: { role: true, content: true },
      },
    },
  });

  if (!conversation) {
    throw new Error("Conversation not found");
  }

  if (conversation.messages.length === 0) {
    throw new Error("Conversation has no messages");
  }

  // Format messages for the LLM
  const formattedMessages = conversation.messages
    .map((m) => `${m.role}: ${m.content}`)
    .join("\n");

  const userPrompt = `Here is the conversation:\n\n${formattedMessages}`;

  let responseText: string;

  // Try OpenAI first (gpt-4o-mini preferred), then Anthropic, then Google
  if (apiKeys.openai) {
    const client = new OpenAI({ apiKey: apiKeys.openai });
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: CLASSIFY_PROMPT },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 256,
    });
    responseText = response.choices[0]?.message?.content ?? "";
  } else if (apiKeys.anthropic) {
    const client = new Anthropic({ apiKey: apiKeys.anthropic });
    const response = await client.messages.create({
      model: "claude-3-haiku-20240307",
      system: CLASSIFY_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
      temperature: 0.3,
      max_tokens: 256,
    });
    const block = response.content[0];
    responseText = block.type === "text" ? block.text : "";
  } else {
    throw new Error(
      "No API keys available for classification. Please add an OpenAI or Anthropic key in Settings."
    );
  }

  // Parse JSON response - handle possible markdown code fences
  let cleaned = responseText.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
  }

  let result: { sentiment: string; topic: string; summary: string };
  try {
    result = JSON.parse(cleaned);
  } catch {
    // Fallback if parsing fails
    result = {
      sentiment: "neutral",
      topic: "unknown",
      summary: "Could not classify conversation.",
    };
  }

  // Validate sentiment value
  const validSentiments = ["positive", "negative", "neutral"];
  if (!validSentiments.includes(result.sentiment)) {
    result.sentiment = "neutral";
  }

  // Update the conversation record
  await prisma.conversation.update({
    where: { id: conversationId },
    data: {
      sentiment: result.sentiment,
      topic: result.topic,
    },
  });

  return result;
}
