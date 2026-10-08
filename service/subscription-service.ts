import prisma from "@/lib/prisma";
import { buildWaMatchConditions } from "@/lib/whatsapp/subscription";

/**
 * Subscription read-model helpers.
 *
 * IMPORTANT: No "use server" here — these helpers perform no auth and are only
 * meant for trusted server code (proxy-protected Server Components / guarded actions).
 */

export interface SubscriptionWithCount {
  id: string;
  targetId: string;
  phoneNumber?: string | null;
  name: string;
  plan: string;
  maxContainers: number;
  expiredAt: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  activeContainersCount: number;
}

/**
 * Returns all WhatsApp subscriptions with their active monitor usage
 * (containers + vessels share a single quota pool).
 */
export async function getAllSubscriptionsWithCount(): Promise<SubscriptionWithCount[]> {
  const [subs, activeContainers, activeVessels] = await Promise.all([
    prisma.waSubscription.findMany({
      orderBy: { createdAt: "desc" },
    }),
    prisma.terminalMonitor.findMany({
      where: { isActive: true },
      select: { waNumber: true },
    }),
    prisma.vesselMonitor.findMany({
      where: { isActive: true },
      select: { waNumber: true },
    }),
  ]);

  // Pre-count monitors per normalized WA value once (O(n + m) instead of O(n * m))
  const usageByWa = new Map<string, number>();
  for (const { waNumber } of [...activeContainers, ...activeVessels]) {
    if (!waNumber) continue;
    const key = waNumber.toLowerCase();
    usageByWa.set(key, (usageByWa.get(key) || 0) + 1);
  }

  return subs.map((sub) => {
    const rawTarget = sub.targetId.trim();
    const rawPhone = sub.phoneNumber?.trim() || "";

    const targetConditions = buildWaMatchConditions(rawTarget);
    const phoneConditions = rawPhone ? buildWaMatchConditions(rawPhone) : [];
    const validWaValues = new Set([
      ...targetConditions.map((c) => c.waNumber.toLowerCase()),
      ...phoneConditions.map((c) => c.waNumber.toLowerCase()),
    ]);

    let activeCount = 0;
    for (const wa of validWaValues) {
      activeCount += usageByWa.get(wa) || 0;
    }

    return {
      ...sub,
      activeContainersCount: activeCount,
    };
  });
}
