"use server";

import prisma from "@/lib/prisma";
import {
  checkWaSubscription,
  formatSubscriptionErrorMessage,
  normalizeWaTargetId,
} from "@/lib/whatsapp/subscription";
import { ActionResponse } from "@/lib";
import { requireAuth } from "@/lib/auth";
import { enableTerminalMonitoringInternal } from "@/service/terminal-monitor-service";

export async function enableTerminalMonitoring(
  containerNo: string,
  port: string,
  status: string,
  waNumber?: string,
  vesselName?: string,
  voyageNo?: string,
  time?: string,
): Promise<ActionResponse<{ message: string }>> {
  const user = await requireAuth();
  const target = user.role === "ADMIN" || user.role === "OWNER"
    ? waNumber
    : user.subscriptionTargetId ?? undefined;
  if (user.role !== "ADMIN" && user.role !== "OWNER" && !target) {
    return { success: false, error: "Akun belum memiliki subscription WhatsApp." };
  }
  return enableTerminalMonitoringInternal(containerNo, port, status, target, vesselName, voyageNo, time);
}

export async function disableTerminalMonitoring(
  containerNo: string
): Promise<ActionResponse<{ message: string }>> {
  try {
    const user = await requireAuth();
    const cleanContainerNo = containerNo.trim().toUpperCase();
    const isAdmin = user.role === "ADMIN" || user.role === "OWNER";
    if (!isAdmin && !user.subscriptionTargetId) {
      return { success: false, error: "Akun belum memiliki subscription WhatsApp." };
    }

    const existing = await prisma.terminalMonitor.findFirst({
      where: {
        containerNo: cleanContainerNo,
        ...(isAdmin ? {} : { waNumber: user.subscriptionTargetId }),
      },
    });

    if (!existing || !existing.isActive) {
      return {
        success: false,
        error: `Container ${cleanContainerNo} is not currently monitored.`,
      };
    }

    await prisma.terminalMonitor.update({
      where: { containerNo: cleanContainerNo },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
    });

    return {
      success: true,
      data: { message: `Monitoring stopped for container ${cleanContainerNo}.` },
    };
  } catch (error) {
    console.error("Disable Monitor Action Error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to disable monitoring.",
    };
  }
}

export interface BatchMonitorResult {
  containerNo: string;
  success: boolean;
  message: string;
}

export async function enableBatchTerminalMonitoring(
  items: Array<{
    containerNo: string;
    port: string;
    status: string;
    vesselName?: string;
    voyageNo?: string;
    time?: string;
  }>,
  waNumber?: string
): Promise<
  ActionResponse<{
    total: number;
    registered: number;
    results: BatchMonitorResult[];
  }>
> {
  if (!items || items.length === 0) {
    return { success: false, error: "Daftar kontainer tidak boleh kosong." };
  }

  try {
    const user = await requireAuth();
    const requestedTarget = user.role === "ADMIN" || user.role === "OWNER"
      ? waNumber
      : user.subscriptionTargetId ?? undefined;
    if (user.role !== "ADMIN" && user.role !== "OWNER" && !requestedTarget) {
      return { success: false, error: "Akun belum memiliki subscription WhatsApp." };
    }
    const rawWaNumber = requestedTarget?.trim() || "";
    const cleanWaNumber = rawWaNumber ? normalizeWaTargetId(rawWaNumber) : undefined;

    // Strict SaaS Subscription Check for total count
    if (cleanWaNumber) {
      const subCheck = await checkWaSubscription(cleanWaNumber, items.length);
      if (!subCheck.allowed) {
        return {
          success: false,
          error: formatSubscriptionErrorMessage(subCheck, rawWaNumber),
        };
      }
    }

    const results: BatchMonitorResult[] = [];
    let registeredCount = 0;

    for (const item of items) {
      const res = await enableTerminalMonitoringInternal(
        item.containerNo,
        item.port,
        item.status,
        cleanWaNumber,
        item.vesselName,
        item.voyageNo,
        item.time,
      );

      if (res.success) {
        registeredCount++;
        results.push({
          containerNo: item.containerNo.trim().toUpperCase(),
          success: true,
          message: res.data.message,
        });
      } else {
        results.push({
          containerNo: item.containerNo.trim().toUpperCase(),
          success: false,
          message: res.error || "Gagal mengaktifkan monitoring",
        });
      }
    }

    return {
      success: true,
      data: {
        total: items.length,
        registered: registeredCount,
        results,
      },
    };
  } catch (error) {
    console.error("Batch Terminal Monitoring Error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Gagal mengaktifkan batch monitoring.",
    };
  }
}
