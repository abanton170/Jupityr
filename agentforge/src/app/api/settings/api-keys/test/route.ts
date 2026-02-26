import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { decryptApiKeys } from "@/lib/encryption";
import { z } from "zod";

const testSchema = z.object({
  provider: z.enum(["openai", "anthropic", "google"]),
  apiKey: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = testSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const { provider, apiKey } = parsed.data;

    // Use provided key or decrypt stored key
    let key = apiKey;
    if (!key) {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { encryptedApiKeys: true },
      });
      if (user?.encryptedApiKeys) {
        const keys = decryptApiKeys(user.encryptedApiKeys);
        key = keys[provider];
      }
    }

    if (!key) {
      return NextResponse.json(
        { error: "No API key provided" },
        { status: 400 }
      );
    }

    // Test the key with a minimal API call
    switch (provider) {
      case "openai": {
        const res = await fetch("https://api.openai.com/v1/models", {
          headers: { Authorization: `Bearer ${key}` },
        });
        if (!res.ok) {
          return NextResponse.json(
            { error: "Invalid OpenAI API key" },
            { status: 400 }
          );
        }
        break;
      }
      case "anthropic": {
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
          },
          body: JSON.stringify({
            model: "claude-3-haiku-20240307",
            max_tokens: 1,
            messages: [{ role: "user", content: "hi" }],
          }),
        });
        // 200 or 400 (bad request) both mean the key is valid
        // 401 means invalid key
        if (res.status === 401) {
          return NextResponse.json(
            { error: "Invalid Anthropic API key" },
            { status: 400 }
          );
        }
        break;
      }
      case "google": {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1/models?key=${key}`
        );
        if (!res.ok) {
          return NextResponse.json(
            { error: "Invalid Google AI API key" },
            { status: 400 }
          );
        }
        break;
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("API key test error:", error);
    return NextResponse.json(
      { error: "Connection test failed" },
      { status: 500 }
    );
  }
}
