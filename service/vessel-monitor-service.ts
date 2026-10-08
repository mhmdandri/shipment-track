import prisma from "@/lib/prisma";
import { ActionResponse } from "@/lib";
import {
  trackVesselSchedule,
  parseVesselDate,
  isVesselSailingOrCompleted,
  isVoyageMatch,
  VesselTrackingResult,
} from "@/actions/tracking/vessel";
import { sendTelegramMessage } from "@/lib/telegram";
import { sendWhatsappMessage } from "@/lib/whatsapp";
import { whatsappMessage } from "@/lib/whatsapp-message";
import {
  checkWaSubscription,
  formatSubscriptionErrorMessage,
  normalizeWaTargetId,
} from "@/lib/whatsapp/subscription";
import { z } from "zod";

/**
 * Vessel open-stack monitoring business logic.
 *
 * IMPORTANT: This module intentionally has NO "use server" directive.
 * Functions here perform no session auth and must only be called from
 * trusted server code (auth-guarded Server Actions, cron, WhatsApp bot handlers).
 */

const enableVesselMonitorSchema = z.object({
  vesselName: z.string().min(2, "Nama kapal minimal 2 karakter"),
  port: z.string().min(2, "Port/Terminal wajib diisi"),
  waNumber: z.string().optional(),
  voyageNo: z.string().optional(),
});

/** Normalizes vessel name: trims, collapses whitespace, uppercases. */
export function normalizeVesselName(vesselName: string): string {
  return vesselName.trim().replace(/\s+/g, " ").toUpperCase();
}

/**
 * Validates WhatsApp subscription quota for a vessel monitor.
 * Re-registering an already-active monitor for the same target consumes no extra quota.
 */
async function checkVesselMonitorQuota(
  cleanWaNumber: string,
  rawWaNumber: string,
  existing: { isActive: boolean; waNumber: string | null } | null,
): Promise<string | null> {
  const isAlreadyActiveForSameTarget = Boolean(
    existing &&
      existing.isActive &&
      existing.waNumber &&
      normalizeWaTargetId(existing.waNumber) === cleanWaNumber,
  );

  const subCheck = await checkWaSubscription(
    cleanWaNumber,
    isAlreadyActiveForSameTarget ? 0 : 1,
  );

  return subCheck.allowed ? null : formatSubscriptionErrorMessage(subCheck, rawWaNumber);
}

/** Dispatches Telegram + optional WhatsApp notifications concurrently, never throwing. */
async function dispatchMonitorNotifications(
  telegramMsg: string,
  waNumber: string | undefined,
  waMsg: string,
): Promise<void> {
  await Promise.all([
    sendTelegramMessage(telegramMsg).catch((e) =>
      console.error("Telegram notification failed:", e),
    ),
    waNumber
      ? sendWhatsappMessage(waNumber, waMsg).catch((e) =>
          console.error("WhatsApp notification failed:", e),
        )
      : Promise.resolve(),
  ]);
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
    const cleanVessel = normalizeVesselName(vesselName);
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
    if (cleanVoyage) {
      if (trackingResult.schedules && trackingResult.schedules.length > 0) {
        selected =
          trackingResult.schedules.find((item) =>
            isVoyageMatch(cleanVoyage, item.voyIn, item.voyOut)
          ) || null;
      } else {
        selected = null;
      }
    }

    const targetVoyageIn = selected?.voyIn || cleanVoyage || "";
    const uniqueKey = {
      vesselName_port_voyageIn: {
        vesselName: cleanVessel,
        port: cleanPort,
        voyageIn: targetVoyageIn,
      },
    };

    // Single lookup reused for subscription check & first-time detection
    const existing = await prisma.vesselMonitor.findUnique({ where: uniqueKey });

    // Strict WhatsApp Subscription Validation
    if (cleanWaNumber) {
      const quotaError = await checkVesselMonitorQuota(cleanWaNumber, rawWaNumber, existing);
      if (quotaError) {
        return { success: false, error: quotaError };
      }
    }

    if (selected && isVesselSailingOrCompleted(selected.status, selected.etd)) {
      return {
        success: false,
        error: `Kapal "${cleanVessel}" (Voyage: ${selected.voyIn || selected.voyOut || "-"}) di ${cleanPort.toUpperCase()} berstatus ${selected.status} (sudah bertolak/selesai ETD). Auto-monitoring tidak perlu diaktifkan.`,
      };
    }

    const scheduleDates = {
      etb: parseVesselDate(selected?.etb),
      ata: parseVesselDate(selected?.ata),
      etd: parseVesselDate(selected?.etd),
      atd: parseVesselDate(selected?.atd),
      openStacking: parseVesselDate(selected?.openStacking),
      closingDoc: parseVesselDate(selected?.closingDoc),
      closingPhysic: parseVesselDate(selected?.closingPhysic),
    };

    await prisma.vesselMonitor.upsert({
      where: uniqueKey,
      update: {
        isActive: true,
        line: selected?.line || undefined,
        voyageIn: targetVoyageIn,
        voyageOut: selected?.voyOut || undefined,
        service: selected?.service || undefined,
        status: selected?.status || "REGISTER",
        ...scheduleDates,
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
        ...scheduleDates,
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

      await dispatchMonitorNotifications(telegramMsg, cleanWaNumber, waMsg);
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
    const cleanVessel = normalizeVesselName(vesselName);
    const cleanVoyage = voyageNo?.trim().toUpperCase() || "";
    const rawWaNumber = waNumber?.trim() || "";
    const cleanWaNumber = rawWaNumber
      ? normalizeWaTargetId(rawWaNumber)
      : undefined;

    const uniqueKey = {
      vesselName_port_voyageIn: {
        vesselName: cleanVessel,
        port: "all",
        voyageIn: cleanVoyage,
      },
    };

    const existing = await prisma.vesselMonitor.findUnique({ where: uniqueKey });

    // Strict WhatsApp Subscription Validation
    if (cleanWaNumber) {
      const quotaError = await checkVesselMonitorQuota(cleanWaNumber, rawWaNumber, existing);
      if (quotaError) {
        return { success: false, error: quotaError };
      }
    }

    await prisma.vesselMonitor.upsert({
      where: uniqueKey,
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

      await dispatchMonitorNotifications(telegramMsg, cleanWaNumber, waMsg);
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
