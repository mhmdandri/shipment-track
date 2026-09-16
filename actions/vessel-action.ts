"use server";

import prisma from "@/lib/prisma";
import { ActionResponse } from "@/lib";
import {
  trackVesselSchedule,
  searchVesselAllPorts,
  parseVesselDate,
  isVesselSailingOrCompleted,
  VesselTrackingResult,
  MultiPortVesselResult,
} from "./tracking/vessel";
import { sendTelegramMessage } from "@/lib/telegram";
import { sendWhatsappMessage } from "@/lib/whatsapp";
import { whatsappMessage } from "@/lib/whatsapp-message";
import {
  checkWaSubscription,
  formatSubscriptionErrorMessage,
  normalizeWaTargetId,
} from "@/lib/whatsapp/subscription";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { getNpct1Vessels, Npct1VesselOption } from "./tracking/ports/npct1";

const searchVesselSchema = z.object({
  port: z.string().min(2, "Port/Terminal wajib diisi"),
  vesselName: z.string().min(2, "Nama kapal minimal 2 karakter"),
  line: z.string().optional(),
});

const enableVesselMonitorSchema = z.object({
  vesselName: z.string().min(2, "Nama kapal minimal 2 karakter"),
  port: z.string().min(2, "Port/Terminal wajib diisi"),
  waNumber: z.string().optional(),
  voyageNo: z.string().optional(),
});

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
 * Searches vessel schedule in real-time across supported port terminals.
 */
export async function searchVesselScheduleAction(
  port: string,
  vesselName: string,
  line?: string,
): Promise<ActionResponse<VesselTrackingResult>> {
  await requireAuth();
  const parsed = searchVesselSchema.safeParse({ port, vesselName, line });
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.errors.map((e) => e.message).join(", "),
    };
  }

  try {
    const result = await trackVesselSchedule(port, vesselName, line);
    if (!result.success) {
      return {
        success: false,
        error:
          result.error ||
          `Gagal mendapatkan jadwal kapal dari ${port.toUpperCase()}.`,
      };
    }
    return { success: true, data: result };
  } catch (error) {
    console.error("searchVesselScheduleAction Error:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "An unexpected error occurred while fetching vessel schedule.",
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

/**
 * Enables auto-monitoring for a vessel open stack schedule across any supported port.
 */
export async function enableVesselMonitoringInternal(
  vesselName: string,
  port: string = "npct1",
  waNumber?: string,
  voyageNo?: string,
): Promise<
  ActionResponse<{ message: string; trackingResult?: VesselTrackingResult }>
> {
  const parsed = enableVesselMonitorSchema.safeParse({
    vesselName,
    port,
    waNumber,
    voyageNo,
  });
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.errors.map((e) => e.message).join(", "),
    };
  }

  try {
    const cleanVessel = vesselName.trim().replace(/\s+/g, " ").toUpperCase();
    const cleanPort = port.trim().toLowerCase();
    const rawWaNumber = waNumber?.trim() || "";
    const cleanWaNumber = rawWaNumber
      ? normalizeWaTargetId(rawWaNumber)
      : undefined;
    const cleanVoyage = voyageNo?.trim() || "";

    // Live query to fetch current schedule details
    const trackingResult = await trackVesselSchedule(cleanPort, cleanVessel);
    let selected = trackingResult.selectedSchedule;

    // If a specific voyage number was provided, strictly select the schedule matching that voyage
    if (
      cleanVoyage &&
      trackingResult.schedules &&
      trackingResult.schedules.length > 0
    ) {
      const rawVq = cleanVoyage.toLowerCase();
      const cleanVq = rawVq.replace(/[^a-z0-9]/g, "");
      const matched = trackingResult.schedules.find((item) => {
        const vIn = (item.voyIn || "")
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "");
        const vOut = (item.voyOut || "")
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "");
        return (
          (vIn.length > 0 &&
            (vIn === cleanVq ||
              vIn.includes(cleanVq) ||
              cleanVq.includes(vIn))) ||
          (vOut.length > 0 &&
            (vOut === cleanVq ||
              vOut.includes(cleanVq) ||
              cleanVq.includes(vOut)))
        );
      });
      if (matched) {
        selected = matched;
      }
    }

    const targetVoyageIn = selected?.voyIn || cleanVoyage || "";

    // Strict WhatsApp Subscription Validation
    if (cleanWaNumber) {
      const existingSubCheck = await prisma.vesselMonitor.findUnique({
        where: {
          vesselName_port_voyageIn: {
            vesselName: cleanVessel,
            port: cleanPort,
            voyageIn: targetVoyageIn,
          },
        },
      });

      const isAlreadyActiveForSameTarget = Boolean(
        existingSubCheck &&
        existingSubCheck.isActive &&
        existingSubCheck.waNumber &&
        normalizeWaTargetId(existingSubCheck.waNumber) === cleanWaNumber,
      );

      const subCheck = await checkWaSubscription(
        cleanWaNumber,
        isAlreadyActiveForSameTarget ? 0 : 1,
      );

      if (!subCheck.allowed) {
        return {
          success: false,
          error: formatSubscriptionErrorMessage(subCheck, rawWaNumber),
        };
      }
    }

    if (selected && isVesselSailingOrCompleted(selected.status, selected.etd)) {
      return {
        success: false,
        error: `Kapal "${cleanVessel}" (Voyage: ${selected.voyIn || selected.voyOut || "-"}) di ${cleanPort.toUpperCase()} berstatus ${selected.status} (sudah bertolak/selesai ETD). Auto-monitoring tidak perlu diaktifkan.`,
      };
    }

    const existing = await prisma.vesselMonitor.findUnique({
      where: {
        vesselName_port_voyageIn: {
          vesselName: cleanVessel,
          port: cleanPort,
          voyageIn: targetVoyageIn,
        },
      },
    });

    await prisma.vesselMonitor.upsert({
      where: {
        vesselName_port_voyageIn: {
          vesselName: cleanVessel,
          port: cleanPort,
          voyageIn: targetVoyageIn,
        },
      },
      update: {
        isActive: true,
        line: selected?.line || undefined,
        voyageIn: targetVoyageIn,
        voyageOut: selected?.voyOut || undefined,
        service: selected?.service || undefined,
        status: selected?.status || "REGISTER",
        etb: parseVesselDate(selected?.etb),
        ata: parseVesselDate(selected?.ata),
        etd: parseVesselDate(selected?.etd),
        atd: parseVesselDate(selected?.atd),
        openStacking: parseVesselDate(selected?.openStacking),
        closingDoc: parseVesselDate(selected?.closingDoc),
        closingPhysic: parseVesselDate(selected?.closingPhysic),
        ...(cleanWaNumber ? { waNumber: cleanWaNumber } : {}),
      },
      create: {
        vesselName: cleanVessel,
        port: cleanPort,
        line: selected?.line || null,
        voyageIn: targetVoyageIn,
        voyageOut: selected?.voyOut || null,
        service: selected?.service || null,
        status: selected?.status || "REGISTER",
        etb: parseVesselDate(selected?.etb),
        ata: parseVesselDate(selected?.ata),
        etd: parseVesselDate(selected?.etd),
        atd: parseVesselDate(selected?.atd),
        openStacking: parseVesselDate(selected?.openStacking),
        closingDoc: parseVesselDate(selected?.closingDoc),
        closingPhysic: parseVesselDate(selected?.closingPhysic),
        waNumber: cleanWaNumber || null,
        isActive: true,
      },
    });

    const isFirstTime = !existing || !existing.isActive;
    const returnMsg = isFirstTime
      ? `Auto-monitoring open stack kapal ${cleanPort.toUpperCase()} (Voyage: ${selected?.voyIn || selected?.voyOut || cleanVoyage || "-"}) berhasil diaktifkan.`
      : `Kapal ini sudah berada dalam daftar auto-monitoring ${cleanPort.toUpperCase()}.`;

    if (isFirstTime) {
      const openStackInfo = selected?.openStacking || "Belum Tersedia";
      const statusInfo = selected?.status || "REGISTER";

      const voyInVal = selected?.voyIn || cleanVoyage || "-";
      const voyOutVal = selected?.voyOut || cleanVoyage || "-";

      const telegramMsg = `🚢 <b>VESSEL MONITORING STARTED (${cleanPort.toUpperCase()})</b> 🚢\n\nVessel: <b>${cleanVessel}</b>\nVoyage In / Out: <b>${voyInVal} / ${voyOutVal}</b>\nStatus: <b>${statusInfo}</b>\nOpen Stacking: <b>${openStackInfo}</b>\n\nSistem akan memeriksa jadwal Open Stacking ${cleanPort.toUpperCase()} secara berkala dan mengirim notifikasi saat jadwal tersedia atau berubah.`;

      const waMsg = whatsappMessage.npct1VesselMonitoringEnabled(
        cleanVessel,
        statusInfo,
        openStackInfo,
        selected?.etb || "-",
        cleanPort,
        voyInVal,
        voyOutVal,
      );

      await Promise.all([
        sendTelegramMessage(telegramMsg).catch((e) =>
          console.error("Telegram notification failed:", e),
        ),
        cleanWaNumber
          ? sendWhatsappMessage(cleanWaNumber, waMsg).catch((e) =>
              console.error("WhatsApp notification failed:", e),
            )
          : Promise.resolve(),
      ]);
    }

    return {
      success: true,
      data: { message: returnMsg, trackingResult },
    };
  } catch (error) {
    console.error("enableVesselMonitoringInternal Error:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Gagal mengaktifkan auto-monitoring kapal.",
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
    const cleanVessel = vesselName.trim().replace(/\s+/g, " ").toUpperCase();
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

/**
 * Enables multi-port auto-monitoring for unscheduled vessels across all 5 supported ports (JICT, NPCT1, KOJA, TMAL, TER3).
 */
export async function enableMultiPortVesselMonitoringInternal(
  vesselName: string,
  voyageNo?: string,
  waNumber?: string,
): Promise<ActionResponse<{ message: string }>> {
  if (!vesselName || vesselName.trim().length < 2) {
    return { success: false, error: "Nama kapal minimal 2 karakter" };
  }

  try {
    const cleanVessel = vesselName.trim().replace(/\s+/g, " ").toUpperCase();
    const cleanVoyage = voyageNo?.trim().toUpperCase() || "";
    const rawWaNumber = waNumber?.trim() || "";
    const cleanWaNumber = rawWaNumber
      ? normalizeWaTargetId(rawWaNumber)
      : undefined;

    // Strict WhatsApp Subscription Validation
    if (cleanWaNumber) {
      const existingSubCheck = await prisma.vesselMonitor.findUnique({
        where: {
          vesselName_port_voyageIn: {
            vesselName: cleanVessel,
            port: "all",
            voyageIn: cleanVoyage,
          },
        },
      });

      const isAlreadyActiveForSameTarget = Boolean(
        existingSubCheck &&
        existingSubCheck.isActive &&
        existingSubCheck.waNumber &&
        normalizeWaTargetId(existingSubCheck.waNumber) === cleanWaNumber,
      );

      const subCheck = await checkWaSubscription(
        cleanWaNumber,
        isAlreadyActiveForSameTarget ? 0 : 1,
      );

      if (!subCheck.allowed) {
        return {
          success: false,
          error: formatSubscriptionErrorMessage(subCheck, rawWaNumber),
        };
      }
    }

    const existing = await prisma.vesselMonitor.findUnique({
      where: {
        vesselName_port_voyageIn: {
          vesselName: cleanVessel,
          port: "all",
          voyageIn: cleanVoyage,
        },
      },
    });

    await prisma.vesselMonitor.upsert({
      where: {
        vesselName_port_voyageIn: {
          vesselName: cleanVessel,
          port: "all",
          voyageIn: cleanVoyage,
        },
      },
      update: {
        isActive: true,
        voyageIn: cleanVoyage,
        voyageOut: cleanVoyage,
        status: "SEARCHING_ALL_PORTS",
        ...(cleanWaNumber ? { waNumber: cleanWaNumber } : {}),
      },
      create: {
        vesselName: cleanVessel,
        port: "all",
        voyageIn: cleanVoyage,
        voyageOut: cleanVoyage,
        status: "SEARCHING_ALL_PORTS",
        waNumber: cleanWaNumber || null,
        isActive: true,
      },
    });

    const isFirstTime = !existing || !existing.isActive;
    const returnMsg = isFirstTime
      ? `Auto-monitoring kapal ${cleanVessel} di seluruh pelabuhan (JICT, NPCT1, KOJA, TMAL, TER3) telah diaktifkan. Sistem akan memindai berkala dan memberikan notifikasi seketika jadwal terdaftar.`
      : `Kapal ${cleanVessel} sudah berada dalam daftar pemantauan seluruh pelabuhan.`;

    if (isFirstTime) {
      const telegramMsg = `🚢 <b>MULTI-PORT VESSEL SCAN REGISTERED</b> 🚢\n\nVessel: <b>${cleanVessel}</b>\nVoyage: <b>${cleanVoyage || "N/A"}</b>\nTarget: <b>ALL 5 PORTS</b>\nStatus: <b>SEARCHING</b>\n\nSistem akan memindai JICT, NPCT1, KOJA, TMAL, TER3 secara berkala. Notifikasi instan akan dikirim saat jadwal terdeteksi.`;

      const waMsg = `🚢 *PEMANTAUAN MULTI-PELABUHAN DIAKTIFKAN* 🚢\n\nKapal: *${cleanVessel}*\nVoyage: *${cleanVoyage || "-"}*\nTarget: *5 Pelabuhan (JICT, NPCT1, KOJA, TMAL, TER3)*\nStatus: *Dalam Pemindaian Berkala*\n\nSistem akan secara otomatis memantau ke-5 pelabuhan domestik dan mengirimkan notifikasi instan WhatsApp ini begitu jadwal sandar / Open Stacking terdaftar!`;

      await Promise.all([
        sendTelegramMessage(telegramMsg).catch((e) =>
          console.error("Telegram notification failed:", e),
        ),
        cleanWaNumber
          ? sendWhatsappMessage(cleanWaNumber, waMsg).catch((e) =>
              console.error("WhatsApp notification failed:", e),
            )
          : Promise.resolve(),
      ]);
    }

    return { success: true, data: { message: returnMsg } };
  } catch (error) {
    console.error("enableMultiPortVesselMonitoringInternal Error:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Gagal mengaktifkan pemantauan kapal multi-pelabuhan.",
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

/**
 * Fetches all currently active vessel monitors.
 */
export async function getActiveVesselMonitorsAction(): Promise<
  ActionResponse<
    Array<{
      id: string;
      vesselName: string;
      port: string;
      line: string | null;
      voyageIn: string | null;
      voyageOut: string | null;
      status: string;
      openStacking: Date | null;
      etb: Date | null;
      etd: Date | null;
      waNumber: string | null;
      isActive: boolean;
      updatedAt: Date;
    }>
  >
> {
  try {
    await requireAuth();
    const monitors = await prisma.vesselMonitor.findMany({
      where: { isActive: true },
      orderBy: { updatedAt: "desc" },
    });
    return { success: true, data: monitors };
  } catch (error) {
    console.error("getActiveVesselMonitorsAction Error:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Gagal mengambil daftar pemantauan kapal.",
    };
  }
}
