"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { ActionResponse } from "@/lib";
import {
  normalizeWaTargetId,
  countActiveContainersForTarget,
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

export async function getSubscriptionsAction(): Promise<
  ActionResponse<SubscriptionWithCount[]>
> {
  try {
    const subs = await prisma.waSubscription.findMany({
      orderBy: { createdAt: "desc" },
    });

    const results: SubscriptionWithCount[] = await Promise.all(
      subs.map(async (sub) => {
        const activeCount = await countActiveContainersForTarget(
          sub.targetId,
          sub.phoneNumber || undefined
        );

        return {
          ...sub,
          activeContainersCount: activeCount,
        };
      })
    );

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

export async function createSubscriptionAction(
  data: unknown
): Promise<ActionResponse<SubscriptionWithCount>> {
  try {
    const parsed = subscriptionSchema.parse(data);
    const normalizedTarget = normalizeWaTargetId(parsed.targetId);
    const normalizedPhone = parsed.phoneNumber
      ? normalizeWaTargetId(parsed.phoneNumber)
      : null;

    if (!normalizedTarget) {
      return { success: false, error: "Invalid WhatsApp target ID format" };
    }

    const expiredDate = new Date(parsed.expiredAt);
    if (isNaN(expiredDate.getTime())) {
      return { success: false, error: "Invalid expiration date" };
    }

    const created = await prisma.waSubscription.create({
      data: {
        targetId: normalizedTarget,
        phoneNumber: normalizedPhone,
        name: parsed.name.trim(),
        plan: parsed.plan,
        maxContainers: parsed.maxContainers,
        expiredAt: expiredDate,
        isActive: parsed.isActive ?? true,
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
    const parsed = subscriptionSchema.parse(data);
    const normalizedTarget = normalizeWaTargetId(parsed.targetId);
    const normalizedPhone = parsed.phoneNumber
      ? normalizeWaTargetId(parsed.phoneNumber)
      : null;

    if (!normalizedTarget) {
      return { success: false, error: "Invalid WhatsApp target ID format" };
    }

    const expiredDate = new Date(parsed.expiredAt);
    if (isNaN(expiredDate.getTime())) {
      return { success: false, error: "Invalid expiration date" };
    }

    const updated = await prisma.waSubscription.update({
      where: { id },
      data: {
        targetId: normalizedTarget,
        phoneNumber: normalizedPhone,
        name: parsed.name.trim(),
        plan: parsed.plan,
        maxContainers: parsed.maxContainers,
        expiredAt: expiredDate,
        isActive: parsed.isActive ?? true,
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
