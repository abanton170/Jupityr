import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { encryptApiKeys, decryptApiKeys, type ApiKeys } from "@/lib/encryption";
import { apiKeysSchema } from "@/lib/validations";

export async function PUT(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = apiKeysSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Get existing keys to merge with new ones
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { encryptedApiKeys: true },
    });

    let existingKeys: ApiKeys = {};
    if (user?.encryptedApiKeys) {
      try {
        existingKeys = decryptApiKeys(user.encryptedApiKeys);
      } catch {
        // If decryption fails, start fresh
      }
    }

    // Merge: only update keys that were provided
    const updatedKeys: ApiKeys = { ...existingKeys };
    if (parsed.data.openai !== undefined) {
      updatedKeys.openai = parsed.data.openai || undefined;
    }
    if (parsed.data.anthropic !== undefined) {
      updatedKeys.anthropic = parsed.data.anthropic || undefined;
    }
    if (parsed.data.google !== undefined) {
      updatedKeys.google = parsed.data.google || undefined;
    }

    const encrypted = encryptApiKeys(updatedKeys);

    await prisma.user.update({
      where: { id: session.user.id },
      data: { encryptedApiKeys: encrypted },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("API keys save error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
