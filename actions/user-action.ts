"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ActionResponse } from "@/lib";
import { requireAuth, hashPassword } from "@/lib/auth";
import { normalizeWaTargetId } from "@/lib/whatsapp/subscription";

export interface UserWithSubscription {
  id: string;
  username: string;
  name: string;
  role: string;
  subscriptionId?: string | null;
  subscription?: {
    id: string;
    targetId: string;
    phoneNumber?: string | null;
    name: string;
    plan: string;
    maxContainers: number;
    expiredAt: Date;
    isActive: boolean;
  } | null;
  createdAt: Date;
  updatedAt: Date;
}

const newSubscriptionSchema = z.object({
  targetId: z.string().min(3, "Target ID WhatsApp / Group ID / LID wajib diisi"),
  phoneNumber: z.string().optional().nullable(),
  name: z.string().min(2, "Nama subscriber / grup wajib diisi"),
  plan: z.string().default("STARTER"),
  maxContainers: z.coerce.number().int().min(0).default(10),
  expiredAt: z.string().or(z.date()),
});

const createMemberUserSchema = z.object({
  name: z.string().min(2, "Nama lengkap minimal 2 karakter"),
  username: z.string().min(3, "Username minimal 3 karakter"),
  password: z.string().min(4, "Password minimal 4 karakter"),
  role: z.enum(["MEMBER", "CS", "ADMIN"]).default("MEMBER"),
  subscriptionMode: z.enum(["existing", "new", "none"]).default("new"),
  existingSubscriptionId: z.string().optional().nullable(),
  newSubscription: newSubscriptionSchema.optional(),
});

export async function getCurrentUserAction(): Promise<
  ActionResponse<{
    id: string;
    username: string;
    name: string;
    role: string;
    subscriptionId?: string | null;
    subscriptionTargetId?: string | null;
    subscriptionName?: string | null;
  }>
> {
  try {
    const authUser = await requireAuth();
    if (!authUser) {
      return { success: false, error: "Unauthenticated" };
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        subscriptionId: true,
        subscription: {
          select: {
            targetId: true,
            name: true,
          },
        },
      },
    });

    if (!dbUser) {
      return { success: false, error: "User not found" };
    }

    return {
      success: true,
      data: {
        id: dbUser.id,
        username: dbUser.username,
        name: dbUser.name,
        role: dbUser.role,
        subscriptionId: dbUser.subscriptionId,
        subscriptionTargetId: dbUser.subscription?.targetId || null,
        subscriptionName: dbUser.subscription?.name || null,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal mengambil data user.",
    };
  }
}

export async function getUsersAction(): Promise<ActionResponse<UserWithSubscription[]>> {
  try {
    const authUser = await requireAuth();
    if (authUser.role !== "ADMIN" && authUser.role !== "OWNER") {
      return {
        success: false,
        error: "Akses ditolak: Hanya Admin/Owner yang dapat mengelola akun pengguna.",
      };
    }

    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        subscriptionId: true,
        createdAt: true,
        updatedAt: true,
        subscription: {
          select: {
            id: true,
            targetId: true,
            phoneNumber: true,
            name: true,
            plan: true,
            maxContainers: true,
            expiredAt: true,
            isActive: true,
          },
        },
      },
    });

    return { success: true, data: users };
  } catch (error) {
    console.error("Error fetching users:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal mengambil data user.",
    };
  }
}

export async function createMemberUserAction(
  data: unknown
): Promise<ActionResponse<UserWithSubscription>> {
  try {
    const authUser = await requireAuth();
    if (authUser.role !== "ADMIN" && authUser.role !== "OWNER") {
      return {
        success: false,
        error: "Akses ditolak: Hanya Admin/Owner yang dapat membuat akun member.",
      };
    }

    const parsed = createMemberUserSchema.parse(data);

    // Check if username already exists
    const existingUser = await prisma.user.findUnique({
      where: { username: parsed.username.trim().toLowerCase() },
    });
    if (existingUser) {
      return {
        success: false,
        error: `Username "${parsed.username}" sudah digunakan.`,
      };
    }

    let finalSubscriptionId: string | null = null;

    // Handle Subscription Creation / Linking
    if (parsed.subscriptionMode === "new" && parsed.newSubscription) {
      const normTarget = normalizeWaTargetId(parsed.newSubscription.targetId);
      const normPhone = parsed.newSubscription.phoneNumber
        ? normalizeWaTargetId(parsed.newSubscription.phoneNumber)
        : null;

      if (!normTarget) {
        return {
          success: false,
          error: "Format Target ID WhatsApp tidak valid.",
        };
      }

      const expiredDate = new Date(parsed.newSubscription.expiredAt);
      if (isNaN(expiredDate.getTime())) {
        return { success: false, error: "Tanggal kadaluarsa tidak valid." };
      }

      // Upsert subscription (or find existing by targetId)
      const subRecord = await prisma.waSubscription.upsert({
        where: { targetId: normTarget },
        update: {
          name: parsed.newSubscription.name.trim(),
          plan: parsed.newSubscription.plan,
          maxContainers: parsed.newSubscription.maxContainers,
          expiredAt: expiredDate,
          isActive: true,
          ...(normPhone ? { phoneNumber: normPhone } : {}),
        },
        create: {
          targetId: normTarget,
          phoneNumber: normPhone,
          name: parsed.newSubscription.name.trim(),
          plan: parsed.newSubscription.plan,
          maxContainers: parsed.newSubscription.maxContainers,
          expiredAt: expiredDate,
          isActive: true,
        },
      });

      finalSubscriptionId = subRecord.id;
    } else if (
      parsed.subscriptionMode === "existing" &&
      parsed.existingSubscriptionId
    ) {
      finalSubscriptionId = parsed.existingSubscriptionId;
    }

    const hashedPassword = await hashPassword(parsed.password);

    const createdUser = await prisma.user.create({
      data: {
        username: parsed.username.trim().toLowerCase(),
        password: hashedPassword,
        name: parsed.name.trim(),
        role: parsed.role,
        subscriptionId: finalSubscriptionId,
      },
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        subscriptionId: true,
        createdAt: true,
        updatedAt: true,
        subscription: {
          select: {
            id: true,
            targetId: true,
            phoneNumber: true,
            name: true,
            plan: true,
            maxContainers: true,
            expiredAt: true,
            isActive: true,
          },
        },
      },
    });

    revalidatePath("/subscriptions");
    return { success: true, data: createdUser };
  } catch (error: unknown) {
    console.error("Error creating member user:", error);

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors.map((e) => e.message).join(", "),
      };
    }

    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Gagal membuat akun member.",
    };
  }
}

export async function updateUserSubscriptionAction(
  userId: string,
  subscriptionId: string | null
): Promise<ActionResponse<UserWithSubscription>> {
  try {
    const authUser = await requireAuth();
    if (authUser.role !== "ADMIN" && authUser.role !== "OWNER") {
      return {
        success: false,
        error: "Akses ditolak.",
      };
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { subscriptionId },
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        subscriptionId: true,
        createdAt: true,
        updatedAt: true,
        subscription: {
          select: {
            id: true,
            targetId: true,
            phoneNumber: true,
            name: true,
            plan: true,
            maxContainers: true,
            expiredAt: true,
            isActive: true,
          },
        },
      },
    });

    revalidatePath("/subscriptions");
    return { success: true, data: updatedUser };
  } catch (error) {
    console.error("Error updating user subscription link:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Gagal memperbarui tautan subscription user.",
    };
  }
}

export async function deleteUserAction(
  userId: string
): Promise<ActionResponse<{ deleted: boolean }>> {
  try {
    const authUser = await requireAuth();
    if (authUser.role !== "ADMIN" && authUser.role !== "OWNER") {
      return {
        success: false,
        error: "Akses ditolak.",
      };
    }

    if (authUser.id === userId) {
      return {
        success: false,
        error: "Anda tidak dapat menghapus akun Anda sendiri.",
      };
    }

    await prisma.user.delete({
      where: { id: userId },
    });

    revalidatePath("/subscriptions");
    return { success: true, data: { deleted: true } };
  } catch (error) {
    console.error("Error deleting user:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Gagal menghapus user.",
    };
  }
}
