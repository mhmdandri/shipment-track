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
  isDefaultOpen?: boolean;
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

export async function checkWaSubscription(
  sender: string,
  newContainersCount: number = 0
): Promise<SubscriptionCheckResult> {
  try {
    const rawSender = sender.trim();
    const normalizedSender = normalizeWaTargetId(sender);
    const cleanId = rawSender.replace(/@(g|c)\.us$/i, "").trim();

    if (!rawSender) {
      return { allowed: true, status: "ALLOWED", isDefaultOpen: true };
    }

    // Check if system has any subscriptions configured
    const totalSubscriptionsCount = await prisma.waSubscription.count();

    // If no subscriptions exist in system, operate in default open mode
    if (totalSubscriptionsCount === 0) {
      return {
        allowed: true,
        status: "ALLOWED",
        isDefaultOpen: true,
      };
    }

    // Flexible query matching normalized, raw, or clean ID format
    const subscription = await prisma.waSubscription.findFirst({
      where: {
        OR: [
          { targetId: normalizedSender },
          { targetId: rawSender },
          { targetId: cleanId },
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
      const activeCount = await prisma.terminalMonitor.count({
        where: {
          OR: [
            { waNumber: normalizedSender },
            { waNumber: rawSender },
            { waNumber: cleanId },
          ],
          isActive: true,
        },
      });

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
    // On unexpected error, default open so bot doesn't crash operations
    return {
      allowed: true,
      status: "ALLOWED",
      isDefaultOpen: true,
    };
  }
}
