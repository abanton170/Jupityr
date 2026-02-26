import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

/**
 * Authenticate a v1 API request using the NextAuth session.
 * Returns the user ID if authenticated, or a NextResponse error.
 */
export async function authenticateApiRequest(): Promise<
  { userId: string } | NextResponse
> {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Unauthorized. Please sign in or provide valid authentication." },
      { status: 401 }
    );
  }

  return { userId: session.user.id };
}

/**
 * Type guard to check if the result is an error response.
 */
export function isApiError(
  result: { userId: string } | NextResponse
): result is NextResponse {
  return result instanceof NextResponse;
}
