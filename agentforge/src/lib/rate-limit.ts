interface RateLimitEntry {
  count: number;
  resetTime: number;
}

interface RateLimitOptions {
  /** Maximum number of requests allowed in the window */
  limit: number;
  /** Time window in milliseconds */
  windowMs: number;
}

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetMs: number;
}

/**
 * In-memory rate limiter using Map.
 *
 * Returns a check function that accepts a key (e.g. IP address or user ID)
 * and returns whether the request should be allowed.
 *
 * Note: This is a per-process in-memory rate limiter. In a multi-instance
 * deployment, consider using Redis-based rate limiting instead.
 */
export function rateLimit(options: RateLimitOptions) {
  const { limit, windowMs } = options;
  const entries = new Map<string, RateLimitEntry>();

  // Periodically clean up expired entries to prevent memory leaks
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of entries) {
      if (now >= entry.resetTime) {
        entries.delete(key);
      }
    }
  }, Math.max(windowMs, 60000)); // Clean up at least every minute

  // Allow garbage collection of the interval if the rate limiter is no longer referenced
  if (cleanupInterval.unref) {
    cleanupInterval.unref();
  }

  return function check(key: string): RateLimitResult {
    const now = Date.now();
    const entry = entries.get(key);

    // No existing entry or window has expired — start fresh
    if (!entry || now >= entry.resetTime) {
      entries.set(key, {
        count: 1,
        resetTime: now + windowMs,
      });
      return {
        success: true,
        limit,
        remaining: limit - 1,
        resetMs: now + windowMs,
      };
    }

    // Within window — check count
    entry.count += 1;

    if (entry.count > limit) {
      return {
        success: false,
        limit,
        remaining: 0,
        resetMs: entry.resetTime,
      };
    }

    return {
      success: true,
      limit,
      remaining: limit - entry.count,
      resetMs: entry.resetTime,
    };
  };
}

/**
 * Pre-configured rate limiter for the public API.
 * 60 requests per minute per key.
 */
export const apiRateLimit = rateLimit({
  limit: 60,
  windowMs: 60 * 1000,
});

/**
 * Pre-configured rate limiter for webhook test endpoints.
 * 5 requests per minute per key.
 */
export const webhookTestRateLimit = rateLimit({
  limit: 5,
  windowMs: 60 * 1000,
});
