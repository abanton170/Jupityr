import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authenticateApiRequest, isApiError } from "@/lib/api-auth";
import { apiRateLimit } from "@/lib/rate-limit";

export async function GET() {
  try {
    const authResult = await authenticateApiRequest();
    if (isApiError(authResult)) return authResult;

    // Rate limit by user ID
    const rateLimitResult = apiRateLimit(authResult.userId);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Try again later." },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": String(rateLimitResult.limit),
            "X-RateLimit-Remaining": String(rateLimitResult.remaining),
            "X-RateLimit-Reset": String(rateLimitResult.resetMs),
          },
        }
      );
    }

    const agents = await prisma.agent.findMany({
      where: { userId: authResult.userId },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        description: true,
        model: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            conversations: true,
            dataSources: true,
            leads: true,
          },
        },
      },
    });

    return NextResponse.json({ data: agents });
  } catch (error) {
    console.error("v1 agents list error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
