import prisma from "@/lib/prisma";

export type SubscriptionCheckStatus =
  | "ALLOWED"
  | "NOT_FOUND"
  | "SUSPENDED"
  | "EXPIRED"
  | "QUOTA_EXCEEDED";

export interface SubscriptionCheckResult {
  allowed: boolean;
  status: SubscriptionCheckStatus;
  subscription?: {
    id: string;
    targetId: string;
    name: string;
    plan: string;
    maxContainers: number;
    expiredAt: Date;
    isActive: boolean;
  };
  activeContainersCount?: number;
  maxContainers?: number;
}

/**
 * Normalizes input string to standard WAHA target ID format.
 * Examples:
 * - "+628123456789" -> "628123456789@c.us"
 * - "08123456789"   -> "628123456789@c.us"
 * - "628123456789"  -> "628123456789@c.us"
 * - "1203630123@g.us" -> "1203630123@g.us"
 */
export function normalizeWaTargetId(input: string): string {
  let cleaned = input.trim();
  if (!cleaned) return "";

  if (cleaned.includes("@")) {
    return cleaned.toLowerCase();
  }

  cleaned = cleaned.replace(/[\s-]/g, "");
  if (cleaned.startsWith("+")) {
    cleaned = cleaned.slice(1);
  }
  if (cleaned.startsWith("0")) {
    cleaned = `62${cleaned.slice(1)}`;
  }

  if (/^\d+$/.test(cleaned)) {
    return `${cleaned}@c.us`;
  }

  return cleaned.toLowerCase();
}

/**
 * Counts active monitored containers for a target ID, supporting multi-format ID matching (raw, clean numeric, @c.us, @g.us, @lid).
 */
export async function countActiveContainersForTarget(
  targetId: string
): Promise<number> {
  try {
    const raw = targetId.trim();
    if (!raw) return 0;

    const cleanId = raw.split("@")[0].trim();
    const normalized = normalizeWaTargetId(targetId);

    return await prisma.terminalMonitor.count({
      where: {
        isActive: true,
        OR: [
          { waNumber: raw },
          { waNumber: cleanId },
          { waNumber: normalized },
          { waNumber: `${cleanId}@c.us` },
          { waNumber: `${cleanId}@g.us` },
          { waNumber: `${cleanId}@lid` },
        ],
      },
    });
  } catch (error) {
    console.error("Error counting active containers for target:", error);
    return 0;
  }
}

export async function checkWaSubscription(
  sender: string,
  newContainersCount: number = 0
): Promise<SubscriptionCheckResult> {
  try {
    const rawSender = sender.trim();
    if (!rawSender) {
      return { allowed: false, status: "NOT_FOUND" };
    }

    const cleanId = rawSender.split("@")[0].trim();
    const normalizedSender = normalizeWaTargetId(sender);

    // Strict subscription check: find matching subscriber by rawSender, clean numeric ID, or normalized ID
    const subscription = await prisma.waSubscription.findFirst({
      where: {
        OR: [
          { targetId: rawSender },
          { targetId: cleanId },
          { targetId: normalizedSender },
          { targetId: `${cleanId}@c.us` },
          { targetId: `${cleanId}@g.us` },
          { targetId: `${cleanId}@lid` },
        ],
      },
    });

    if (!subscription) {
      return {
        allowed: false,
        status: "NOT_FOUND",
      };
    }

    if (!subscription.isActive) {
      return {
        allowed: false,
        status: "SUSPENDED",
        subscription,
      };
    }

    if (new Date(subscription.expiredAt).getTime() < Date.now()) {
      return {
        allowed: false,
        status: "EXPIRED",
        subscription,
      };
    }

    if (subscription.maxContainers > 0) {
      const activeCount = await countActiveContainersForTarget(rawSender);

      if (activeCount + newContainersCount > subscription.maxContainers) {
        return {
          allowed: false,
          status: "QUOTA_EXCEEDED",
          subscription,
          activeContainersCount: activeCount,
          maxContainers: subscription.maxContainers,
        };
      }

      return {
        allowed: true,
        status: "ALLOWED",
        subscription,
        activeContainersCount: activeCount,
        maxContainers: subscription.maxContainers,
      };
    }

    return {
      allowed: true,
      status: "ALLOWED",
      subscription,
    };
  } catch (error) {
    console.error("Error checking WA subscription:", error);
    return {
      allowed: false,
      status: "NOT_FOUND",
    };
  }
}
