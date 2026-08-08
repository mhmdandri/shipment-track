"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { ActionResponse } from "@/lib";
import { requireAuth } from "@/lib/auth";
import {
  normalizeWaTargetId,
  countActiveContainersForTarget,
  buildWaMatchConditions,
} from "@/lib/whatsapp/subscription";
import { z } from "zod";

const subscriptionSchema = z.object({
  targetId: z.string().min(3, "Target ID / WhatsApp number / LID is required"),
  phoneNumber: z.string().optional().nullable(),
  name: z.string().min(2, "Subscriber / Client name is required"),
  plan: z.string().min(1, "Plan selection is required"),
  maxContainers: z.coerce.number().int().min(0, "Max containers must be 0 or greater"),
  expiredAt: z.string().or(z.date()),
  isActive: z.boolean().optional().default(true),
});

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

  const activeMonitorNumbers = [
    ...activeContainers.map((c) => c.waNumber).filter((w): w is string => Boolean(w)),
    ...activeVessels.map((v) => v.waNumber).filter((w): w is string => Boolean(w)),
  ];

  return subs.map((sub) => {
    const rawTarget = sub.targetId.trim();
    const rawPhone = sub.phoneNumber?.trim() || "";

    const targetConditions = buildWaMatchConditions(rawTarget);
    const phoneConditions = rawPhone ? buildWaMatchConditions(rawPhone) : [];
    const validWaValues = new Set([
      ...targetConditions.map((c) => c.waNumber.toLowerCase()),
      ...phoneConditions.map((c) => c.waNumber.toLowerCase()),
    ]);

    const activeCount = activeMonitorNumbers.filter((wa) =>
      validWaValues.has(wa.toLowerCase())
    ).length;

    return {
      ...sub,
      activeContainersCount: activeCount,
    };
  });
}

function parseSubscriptionInput(data: unknown): {
  normalizedTarget: string;
  normalizedPhone: string | null;
  name: string;
  plan: string;
  maxContainers: number;
  expiredDate: Date;
  isActive: boolean;
} {
  const parsed = subscriptionSchema.parse(data);
  const normalizedTarget = normalizeWaTargetId(parsed.targetId);
  const normalizedPhone = parsed.phoneNumber
    ? normalizeWaTargetId(parsed.phoneNumber)
    : null;

  if (!normalizedTarget) {
    throw new Error("Invalid WhatsApp target ID format");
  }

  const expiredDate = new Date(parsed.expiredAt);
  if (isNaN(expiredDate.getTime())) {
    throw new Error("Invalid expiration date");
  }

  return {
    normalizedTarget,
    normalizedPhone,
    name: parsed.name.trim(),
    plan: parsed.plan,
    maxContainers: parsed.maxContainers,
    expiredDate,
    isActive: parsed.isActive ?? true,
  };
}

export async function getSubscriptionsAction(): Promise<
  ActionResponse<SubscriptionWithCount[]>
> {
  try {
    await requireAuth();
    const results = await getAllSubscriptionsWithCount();
    return { success: true, data: results };
  } catch (error) {
    console.error("Error fetching subscriptions:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch subscriptions.",
    };
  }
}

export async function getActiveSubscriptionsAction(): Promise<
  ActionResponse<Array<{ id: string; targetId: string; name: string; isGroup: boolean }>>
> {
  try {
    const subs = await prisma.waSubscription.findMany({
      where: {
        isActive: true,
        expiredAt: { gt: new Date() },
      },
      orderBy: { name: "asc" },
      select: {
        id: true,
        targetId: true,
        name: true,
      },
    });

    const formatted = subs.map((s) => ({
      id: s.id,
      targetId: s.targetId,
      name: s.name,
      isGroup: s.targetId.endsWith("@g.us"),
    }));

    return { success: true, data: formatted };
  } catch (error) {
    console.error("Error fetching active subscriptions:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch active subscriptions.",
    };
  }
}

export async function createSubscriptionAction(
  data: unknown
): Promise<ActionResponse<SubscriptionWithCount>> {
  try {
    await requireAuth();
    const input = parseSubscriptionInput(data);

    const created = await prisma.waSubscription.create({
      data: {
        targetId: input.normalizedTarget,
        phoneNumber: input.normalizedPhone,
        name: input.name,
        plan: input.plan,
        maxContainers: input.maxContainers,
        expiredAt: input.expiredDate,
        isActive: input.isActive,
      },
    });

    const activeCount = await countActiveContainersForTarget(
      created.targetId,
      created.phoneNumber || undefined
    );

    revalidatePath("/subscriptions");
    return {
      success: true,
      data: { ...created, activeContainersCount: activeCount },
    };
  } catch (error: unknown) {
    console.error("Error creating subscription:", error);
    
    // Prisma unique constraint violation code P2002
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return {
        success: false,
        error: "Target WhatsApp ID (nomor/grup) tersebut sudah terdaftar.",
      };
    }

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to create subscription.",
    };
  }
}

export async function updateSubscriptionAction(
  id: string,
  data: unknown
): Promise<ActionResponse<SubscriptionWithCount>> {
  try {
    await requireAuth();
    const input = parseSubscriptionInput(data);

    const updated = await prisma.waSubscription.update({
      where: { id },
      data: {
        targetId: input.normalizedTarget,
        phoneNumber: input.normalizedPhone,
        name: input.name,
        plan: input.plan,
        maxContainers: input.maxContainers,
        expiredAt: input.expiredDate,
        isActive: input.isActive,
      },
    });

    const activeCount = await countActiveContainersForTarget(
      updated.targetId,
      updated.phoneNumber || undefined
    );

    revalidatePath("/subscriptions");
    return {
      success: true,
      data: { ...updated, activeContainersCount: activeCount },
    };
  } catch (error: unknown) {
    console.error("Error updating subscription:", error);

    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return {
        success: false,
        error: "Target WhatsApp ID (nomor/grup) tersebut sudah terdaftar.",
      };
    }

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to update subscription.",
    };
  }
}

export async function toggleSubscriptionAction(
  id: string,
  isActive: boolean
): Promise<ActionResponse<SubscriptionWithCount>> {
  try {
    await requireAuth();
    const updated = await prisma.waSubscription.update({
      where: { id },
      data: { isActive },
    });

    const activeCount = await countActiveContainersForTarget(
      updated.targetId,
      updated.phoneNumber || undefined
    );

    revalidatePath("/subscriptions");
    return {
      success: true,
      data: { ...updated, activeContainersCount: activeCount },
    };
  } catch (error) {
    console.error("Error toggling subscription:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to toggle subscription status.",
    };
  }
}

export async function deleteSubscriptionAction(
  id: string
): Promise<ActionResponse<null>> {
  try {
    await requireAuth();
    await prisma.waSubscription.delete({
      where: { id },
    });

    revalidatePath("/subscriptions");
    return { success: true, data: null };
  } catch (error) {
    console.error("Error deleting subscription:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to delete subscription.",
    };
  }
}

