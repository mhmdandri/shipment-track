"use server";

import prisma from "@/lib/prisma";
import { ActionResponse } from "@/lib";
import {
  searchVesselAllPorts,
  VesselTrackingResult,
  MultiPortVesselResult,
} from "./tracking/vessel";
import { requireAuth } from "@/lib/auth";
import { getNpct1Vessels, Npct1VesselOption } from "./tracking/ports/npct1";
import {
  enableVesselMonitoringInternal,
  enableMultiPortVesselMonitoringInternal,
  normalizeVesselName,
} from "@/service/vessel-monitor-service";

/**
 * Fetches available NPCT1 vessel select options directly from NPCT1 server.
 */
export async function getNpct1VesselOptionsAction(): Promise<
  ActionResponse<Npct1VesselOption[]>
> {
  try {
    await requireAuth();
    const vessels = await getNpct1Vessels();
    return { success: true, data: vessels };
  } catch (error) {
    console.error("getNpct1VesselOptionsAction Error:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Gagal mendapatkan daftar kapal dari NPCT1.",
    };
  }
}

/**
 * Searches vessel schedule in real-time across ALL supported ports simultaneously.
 */
export async function searchVesselAllPortsAction(
  vesselName: string,
): Promise<ActionResponse<MultiPortVesselResult>> {
  await requireAuth();
  if (!vesselName || vesselName.trim().length < 2) {
    return { success: false, error: "Nama kapal minimal 2 karakter" };
  }

  try {
    const result = await searchVesselAllPorts(vesselName);
    return { success: true, data: result };
  } catch (error) {
    console.error("searchVesselAllPortsAction Error:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "An unexpected error occurred while searching multi-port vessel schedules.",
    };
  }
}

export async function enableVesselMonitoringAction(
  vesselName: string,
  port: string = "npct1",
  waNumber?: string,
  voyageNo?: string,
): Promise<
  ActionResponse<{ message: string; trackingResult?: VesselTrackingResult }>
> {
  await requireAuth();
  return enableVesselMonitoringInternal(vesselName, port, waNumber, voyageNo);
}

/**
 * Disables auto-monitoring for a vessel open stack schedule.
 */
export async function disableVesselMonitoringAction(
  vesselName: string,
  port: string,
  voyageIn?: string,
  id?: string,
): Promise<ActionResponse<{ message: string }>> {
  try {
    await requireAuth();
    const cleanVessel = normalizeVesselName(vesselName);
    const cleanPort = port.trim().toLowerCase();

    let targetId = id;
    if (!targetId) {
      const existing = await prisma.vesselMonitor.findFirst({
        where: {
          vesselName: cleanVessel,
          port: cleanPort,
          ...(voyageIn !== undefined ? { voyageIn } : {}),
          isActive: true,
        },
      });
      if (existing) {
        targetId = existing.id;
      }
    }

    if (!targetId) {
      return {
        success: false,
        error: `Kapal "${cleanVessel}" di ${cleanPort.toUpperCase()} tidak ditemukan atau sudah tidak aktif.`,
      };
    }

    await prisma.vesselMonitor.update({
      where: { id: targetId },
      data: { isActive: false },
    });

    return {
      success: true,
      data: {
        message: `Pemantauan otomatis untuk kapal ${cleanVessel} (${cleanPort.toUpperCase()}) telah dihentikan.`,
      },
    };
  } catch (error) {
    console.error("disableVesselMonitoringAction Error:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Gagal menonaktifkan pemantauan kapal.",
    };
  }
}

export async function enableMultiPortVesselMonitoringAction(
  vesselName: string,
  voyageNo?: string,
  waNumber?: string,
): Promise<ActionResponse<{ message: string }>> {
  await requireAuth();
  return enableMultiPortVesselMonitoringInternal(
    vesselName,
    voyageNo,
    waNumber,
  );
}
