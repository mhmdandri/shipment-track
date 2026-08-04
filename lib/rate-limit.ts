interface RateLimitRecord {
  timestamps: number[];
}

const cache = new Map<string, RateLimitRecord>();

// Cleanup stale records periodically (every 5 minutes)
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of cache.entries()) {
      record.timestamps = record.timestamps.filter((ts) => now - ts < 60000);
      if (record.timestamps.length === 0) {
        cache.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetMs: number;
}

/**
 * In-memory sliding window rate limiter
 * @param key Identifier (e.g., IP address or IP + route)
 * @param limit Maximum allowed requests within window
 * @param windowMs Time window in milliseconds (default: 60,000ms / 1 minute)
 */
export function checkRateLimit(
  key: string,
  limit: number = 5,
  windowMs: number = 60 * 1000
): RateLimitResult {
  const now = Date.now();
  const record = cache.get(key) || { timestamps: [] };

  // Filter timestamps outside current window
  const validTimestamps = record.timestamps.filter((ts) => now - ts < windowMs);

  if (validTimestamps.length >= limit) {
    const oldestTimestamp = validTimestamps[0];
    const resetMs = windowMs - (now - oldestTimestamp);
    return {
      success: false,
      limit,
      remaining: 0,
      resetMs: Math.max(0, resetMs),
    };
  }

  validTimestamps.push(now);
  cache.set(key, { timestamps: validTimestamps });

  return {
    success: true,
    limit,
    remaining: limit - validTimestamps.length,
    resetMs: windowMs,
  };
}
