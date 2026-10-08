import crypto from "crypto";

/**
 * Constant-time string comparison to prevent timing attacks on secrets/tokens.
 * Returns false when either value is empty.
 */
export function safeCompare(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);
  if (aBuffer.length !== bBuffer.length) return false;
  return crypto.timingSafeEqual(aBuffer, bBuffer);
}

/**
 * Extracts the originating client IP from proxy headers (x-forwarded-for / x-real-ip).
 * Falls back to loopback so rate limiting still keys deterministically in local dev.
 */
export function getClientIp(headers: Headers): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip")?.trim() ||
    "127.0.0.1"
  );
}
