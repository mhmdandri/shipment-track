import prisma from "@/lib/prisma";
import { sendWhatsappMessage } from "../whatsapp";
import { whatsappMessage } from "../whatsapp-message";

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
 * - "120363012345678901@g.us" -> "120363012345678901@g.us"
 * - "120363012345678901" -> "120363012345678901@g.us"
 * - "628123456789-1612345678@g.us" -> "628123456789-1612345678@g.us"
 * - "145844254802166@lid" -> "145844254802166@lid"
 */
export function normalizeWaTargetId(input: string): string {
  const cleaned = input.trim();
  if (!cleaned) return "";

  const parts = cleaned.split("@");
  const rawNum = parts[0].trim();
  const domain = parts[1] ? parts[1].toLowerCase().trim() : "";

  // 1. Explicit domain handling takes absolute priority
  if (domain === "g.us") {
    const numPart = rawNum.replace(/[\s\(\)]/g, "");
    return `${numPart}@g.us`;
  }
  if (domain === "lid") {
    const numPart = rawNum.replace(/[\s\-\(\)\.]/g, "");
    return `${numPart}@lid`;
  }

  // 2. Legacy Group format with hyphen (e.g. 628123456789-1612345678)
  if (rawNum.includes("-")) {
    const numPart = rawNum.replace(/[\s\(\)]/g, "");
    return `${numPart}@g.us`;
  }

  let numPart = rawNum.replace(/[\s\-\(\)\.]/g, "");
  if (numPart.startsWith("+")) numPart = numPart.slice(1);
  if (numPart.startsWith("0")) numPart = `62${numPart.slice(1)}`;

  if (domain === "c.us") {
    // If numPart starts with 120363, it's actually a Group JID despite domain being c.us
    if (numPart.startsWith("120363")) {
      return `${numPart}@g.us`;
    }
    return `${numPart}@c.us`;
  }

  if (/^\d+$/.test(numPart)) {
    // Check for WhatsApp Group JID prefix (120363...)
    if (numPart.startsWith("120363")) {
      return `${numPart}@g.us`;
    }
    // Meta LID format detection (LIDs are 14+ digits not starting with 62 or 120363)
    if (numPart.length >= 14 && !numPart.startsWith("62")) {
      return `${numPart}@lid`;
    }
    // Standard phone number
    return `${numPart}@c.us`;
  }

  return cleaned.toLowerCase();
}

export function buildWaMatchConditions(
  rawId: string,
): Array<{ waNumber: string }> {
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
    ]),
  );

  return values.map((val) => ({ waNumber: val }));
}

/**
 * Counts total active monitored items (containers + vessels) for a target ID or alternate phone number,
 * supporting multi-format ID matching (raw, clean numeric, @c.us, @g.us, @lid).
 */
export async function countActiveContainersForTarget(
  targetId: string,
  alternateId?: string,
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
  alternateSender?: string,
): Promise<SubscriptionCheckResult> {
  try {
    const rawSenders = [sender, alternateSender].filter((s): s is string =>
      Boolean(s && s.trim()),
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

      const phoneCandidate = !isSenderLid
        ? normSender
        : !isAltLid
          ? normAlt
          : null;
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
        subscription.phoneNumber || alternateSender,
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

export function formatSubscriptionErrorMessage(
  subCheck: SubscriptionCheckResult,
  rawWaNumber: string,
): string {
  if (subCheck.status === "SUSPENDED") {
    return `Langganan WhatsApp untuk nomor ${rawWaNumber} sedang di-suspend.`;
  }
  if (subCheck.status === "EXPIRED") {
    const expDate = subCheck.subscription?.expiredAt
      ? new Date(subCheck.subscription.expiredAt).toLocaleDateString("id-ID")
      : "-";
    return `Langganan WhatsApp untuk nomor ${rawWaNumber} telah kadaluarsa pada ${expDate}.`;
  }
  if (subCheck.status === "QUOTA_EXCEEDED") {
    return `Kuota pemantauan aktif WhatsApp telah penuh (${subCheck.activeContainersCount}/${subCheck.maxContainers}).`;
  }
  return `Nomor WhatsApp ${rawWaNumber} belum terdaftar sebagai subscriber aktif.`;
}

export async function verifyAndReplyWaSubscription(
  sender: string,
  newContainersCount: number = 0,
  alternateSender?: string,
): Promise<boolean> {
  const subCheck = await checkWaSubscription(
    sender,
    newContainersCount,
    alternateSender,
  );
  if (subCheck.allowed) return true;

  if (subCheck.status === "NOT_FOUND") {
    await sendWhatsappMessage(
      sender,
      whatsappMessage.subscriptionRequired(sender),
    );
  } else if (subCheck.status === "EXPIRED" && subCheck.subscription) {
    await sendWhatsappMessage(
      sender,
      whatsappMessage.subscriptionExpired(subCheck.subscription.expiredAt),
    );
  } else if (subCheck.status === "SUSPENDED") {
    await sendWhatsappMessage(sender, whatsappMessage.subscriptionSuspended());
  } else if (
    subCheck.status === "QUOTA_EXCEEDED" &&
    subCheck.activeContainersCount !== undefined &&
    subCheck.maxContainers !== undefined
  ) {
    await sendWhatsappMessage(
      sender,
      whatsappMessage.quotaExceeded(
        subCheck.activeContainersCount,
        subCheck.maxContainers,
      ),
    );
  }
  return false;
}
