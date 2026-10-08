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
  voyageNo?: string
): Promise<ActionResponse<{ message: string }>> {
  await requireAuth();
  return enableTerminalMonitoringInternal(containerNo, port, status, waNumber, vesselName, voyageNo);
}

export async function disableTerminalMonitoring(
  containerNo: string
): Promise<ActionResponse<{ message: string }>> {
  try {
    await requireAuth();
    const cleanContainerNo = containerNo.trim().toUpperCase();
    const existing = await prisma.terminalMonitor.findUnique({
      where: { containerNo: cleanContainerNo },
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
    await requireAuth();
    const rawWaNumber = waNumber?.trim() || "";
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
        item.voyageNo
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
