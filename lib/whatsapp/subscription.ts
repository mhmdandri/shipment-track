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
    phoneNumber?: string | null;
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
 * - "145844254802166@lid" -> "145844254802166@lid"
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

function buildWaMatchConditions(rawId: string): Array<{ waNumber: string }> {
  const raw = rawId.trim();
  if (!raw) return [];

  const clean = raw.split("@")[0].trim();
  const normalized = normalizeWaTargetId(rawId);

  let zeroLocal = clean;
  let intlLocal = clean;

  if (clean.startsWith("62")) {
    zeroLocal = `0${clean.slice(2)}`;
  } else if (clean.startsWith("0")) {
    intlLocal = `62${clean.slice(1)}`;
  }

  const values = Array.from(
    new Set([
      raw,
      clean,
      normalized,
      zeroLocal,
      intlLocal,
      `${clean}@c.us`,
      `${zeroLocal}@c.us`,
      `${intlLocal}@c.us`,
      `${clean}@g.us`,
      `${zeroLocal}@g.us`,
      `${intlLocal}@g.us`,
      `${clean}@lid`,
    ])
  );

  return values.map((val) => ({ waNumber: val }));
}

/**
 * Counts total active monitored items (containers + vessels) for a target ID or alternate phone number,
 * supporting multi-format ID matching (raw, clean numeric, @c.us, @g.us, @lid).
 */
export async function countActiveContainersForTarget(
  targetId: string,
  alternateId?: string
): Promise<number> {
  try {
    const raw = targetId.trim();
    if (!raw) return 0;

    const conditions = [
      ...buildWaMatchConditions(raw),
      ...(alternateId ? buildWaMatchConditions(alternateId) : []),
    ];

    const [containerCount, vesselCount] = await Promise.all([
      prisma.terminalMonitor.count({
        where: {
          isActive: true,
          OR: conditions,
        },
      }),
      prisma.vesselMonitor.count({
        where: {
          isActive: true,
          OR: conditions,
        },
      }),
    ]);

    return containerCount + vesselCount;
  } catch (error) {
    console.error("Error counting active monitors for target:", error);
    return 0;
  }
}

export async function checkWaSubscription(
  sender: string,
  newContainersCount: number = 0,
  alternateSender?: string
): Promise<SubscriptionCheckResult> {
  try {
    const rawSenders = [sender, alternateSender].filter(
      (s): s is string => Boolean(s && s.trim())
    );

    if (rawSenders.length === 0) {
      return { allowed: false, status: "NOT_FOUND" };
    }

    // Build comprehensive OR match conditions across targetId and phoneNumber columns
    const matchConditions: Array<Record<string, string>> = [];
    for (const s of rawSenders) {
      const clean = s.split("@")[0].trim();
      const norm = normalizeWaTargetId(s);
      const candidates = [
        s,
        clean,
        norm,
        `${clean}@c.us`,
        `${clean}@g.us`,
        `${clean}@lid`,
      ];

      for (const cand of candidates) {
        if (cand) {
          matchConditions.push({ targetId: cand });
          matchConditions.push({ phoneNumber: cand });
        }
      }
    }

    // Strict subscription check with dual identity fallback
    const subscription = await prisma.waSubscription.findFirst({
      where: {
        OR: matchConditions,
      },
    });

    if (!subscription) {
      return {
        allowed: false,
        status: "NOT_FOUND",
      };
    }

    // Auto-link alternate identity if missing from database record
    if (alternateSender) {
      const normSender = normalizeWaTargetId(sender);
      const normAlt = normalizeWaTargetId(alternateSender);

      const isSenderLid = normSender.endsWith("@lid");
      const isAltLid = normAlt.endsWith("@lid");

      const phoneCandidate = !isSenderLid ? normSender : !isAltLid ? normAlt : null;
      const lidCandidate = isSenderLid ? normSender : isAltLid ? normAlt : null;

      const updateData: { phoneNumber?: string } = {};

      if (
        phoneCandidate &&
        !subscription.phoneNumber &&
        subscription.targetId !== phoneCandidate
      ) {
        updateData.phoneNumber = phoneCandidate;
      } else if (
        lidCandidate &&
        !subscription.phoneNumber &&
        subscription.targetId !== lidCandidate
      ) {
        updateData.phoneNumber = lidCandidate;
      }

      if (Object.keys(updateData).length > 0) {
        await prisma.waSubscription
          .update({
            where: { id: subscription.id },
            data: updateData,
          })
          .catch(() => {}); // silent catch
      }
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
      const activeCount = await countActiveContainersForTarget(
        subscription.targetId,
        subscription.phoneNumber || alternateSender
      );

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
