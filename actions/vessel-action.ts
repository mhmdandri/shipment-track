"use server";

import prisma from "@/lib/prisma";
import { ActionResponse } from "@/lib";
import {
  trackVesselSchedule,
  searchVesselAllPorts,
  VesselTrackingResult,
  MultiPortVesselResult,
} from "./tracking/vessel";
import { sendTelegramMessage } from "@/lib/telegram";
import { sendWhatsappMessage } from "@/lib/whatsapp";
import { whatsappMessage } from "@/lib/whatsapp-message";
import {
  checkWaSubscription,
  normalizeWaTargetId,
} from "@/lib/whatsapp/subscription";
import { z } from "zod";

const searchVesselSchema = z.object({
  port: z.string().min(2, "Port/Terminal wajib diisi"),
  vesselName: z.string().min(2, "Nama kapal minimal 2 karakter"),
  line: z.string().optional(),
});

const enableVesselMonitorSchema = z.object({
  vesselName: z.string().min(2, "Nama kapal minimal 2 karakter"),
  port: z.string().min(2, "Port/Terminal wajib diisi"),
  waNumber: z.string().optional(),
});

/**
 * Searches vessel schedule in real-time across supported port terminals.
 */
export async function searchVesselScheduleAction(
  port: string,
  vesselName: string,
  line?: string
): Promise<ActionResponse<VesselTrackingResult>> {
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
        error: result.error || `Gagal mendapatkan jadwal kapal dari ${port.toUpperCase()}.`,
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
  vesselName: string
): Promise<ActionResponse<MultiPortVesselResult>> {
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
export async function enableVesselMonitoringAction(
  vesselName: string,
  port: string = "npct1",
  waNumber?: string
): Promise<ActionResponse<{ message: string; trackingResult?: VesselTrackingResult }>> {
  const parsed = enableVesselMonitorSchema.safeParse({ vesselName, port, waNumber });
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.errors.map((e) => e.message).join(", "),
    };
  }

  try {
    const cleanVessel = vesselName.trim().toUpperCase();
    const cleanPort = port.trim().toLowerCase();
    const rawWaNumber = waNumber?.trim() || "";
    const cleanWaNumber = rawWaNumber ? normalizeWaTargetId(rawWaNumber) : undefined;

    // Strict WhatsApp Subscription Validation
    if (cleanWaNumber) {
      const existingSubCheck = await prisma.vesselMonitor.findUnique({
        where: { vesselName_port: { vesselName: cleanVessel, port: cleanPort } },
      });

      const isAlreadyActiveForSameTarget = Boolean(
        existingSubCheck &&
          existingSubCheck.isActive &&
          existingSubCheck.waNumber &&
          normalizeWaTargetId(existingSubCheck.waNumber) === cleanWaNumber
      );

      const subCheck = await checkWaSubscription(
        cleanWaNumber,
        isAlreadyActiveForSameTarget ? 0 : 1
      );

      if (!subCheck.allowed) {
        let errorMsg = `Nomor WhatsApp ${rawWaNumber} belum terdaftar sebagai subscriber aktif.`;
        if (subCheck.status === "SUSPENDED") {
          errorMsg = `Langganan WhatsApp untuk nomor ${rawWaNumber} sedang di-suspend.`;
        } else if (subCheck.status === "EXPIRED") {
          const expDate = subCheck.subscription?.expiredAt
            ? new Date(subCheck.subscription.expiredAt).toLocaleDateString("id-ID")
            : "-";
          errorMsg = `Langganan WhatsApp untuk nomor ${rawWaNumber} telah kadaluarsa pada ${expDate}.`;
        } else if (subCheck.status === "QUOTA_EXCEEDED") {
          errorMsg = `Kuota pemantauan aktif WhatsApp telah penuh (${subCheck.activeContainersCount}/${subCheck.maxContainers}).`;
        }
        return { success: false, error: errorMsg };
      }
    }

    // Live query to fetch current schedule details
    const trackingResult = await trackVesselSchedule(cleanPort, cleanVessel);
    const selected = trackingResult.selectedSchedule;

    if (selected) {
      const statusUpper = selected.status.trim().toUpperCase();
      const isSailingOrCompleted = [
        "SAILING",
        "SAILED",
        "COMPLETE",
        "COMPLETED",
        "FINISH",
        "FINISHED",
        "DEPARTED",
        "DEPARTURE",
        "LEAVING",
        "OUTGT",
      ].some((keyword) => statusUpper.includes(keyword));

      if (isSailingOrCompleted) {
        return {
          success: false,
          error: `Kapal "${cleanVessel}" di ${cleanPort.toUpperCase()} berstatus ${selected.status} (sudah bertolak/selesai). Auto-monitoring tidak perlu diaktifkan.`,
        };
      }
    }

    const parseDate = (dStr: string | null | undefined) => {
      if (!dStr) return null;
      const d = new Date(dStr.replace(/-/g, "/"));
      return isNaN(d.getTime()) ? null : d;
    };

    const existing = await prisma.vesselMonitor.findUnique({
      where: { vesselName_port: { vesselName: cleanVessel, port: cleanPort } },
    });

    await prisma.vesselMonitor.upsert({
      where: { vesselName_port: { vesselName: cleanVessel, port: cleanPort } },
      update: {
        isActive: true,
        line: selected?.line || undefined,
        voyageIn: selected?.voyIn || undefined,
        voyageOut: selected?.voyOut || undefined,
        service: selected?.service || undefined,
        status: selected?.status || "REGISTER",
        etb: parseDate(selected?.etb),
        ata: parseDate(selected?.ata),
        etd: parseDate(selected?.etd),
        atd: parseDate(selected?.atd),
        openStacking: parseDate(selected?.openStacking),
        closingDoc: parseDate(selected?.closingDoc),
        closingPhysic: parseDate(selected?.closingPhysic),
        ...(cleanWaNumber ? { waNumber: cleanWaNumber } : {}),
      },
      create: {
        vesselName: cleanVessel,
        port: cleanPort,
        line: selected?.line || null,
        voyageIn: selected?.voyIn || null,
        voyageOut: selected?.voyOut || null,
        service: selected?.service || null,
        status: selected?.status || "REGISTER",
        etb: parseDate(selected?.etb),
        ata: parseDate(selected?.ata),
        etd: parseDate(selected?.etd),
        atd: parseDate(selected?.atd),
        openStacking: parseDate(selected?.openStacking),
        closingDoc: parseDate(selected?.closingDoc),
        closingPhysic: parseDate(selected?.closingPhysic),
        waNumber: cleanWaNumber || null,
        isActive: true,
      },
    });

    const isFirstTime = !existing || !existing.isActive;
    const returnMsg = isFirstTime
      ? `Auto-monitoring open stack kapal ${cleanPort.toUpperCase()} berhasil diaktifkan.`
      : `Kapal ini sudah berada dalam daftar auto-monitoring ${cleanPort.toUpperCase()}.`;

    if (isFirstTime) {
      const openStackInfo = selected?.openStacking || "Belum Tersedia";
      const statusInfo = selected?.status || "REGISTER";

      const telegramMsg = `🚢 <b>VESSEL MONITORING STARTED (${cleanPort.toUpperCase()})</b> 🚢\n\nVessel: <b>${cleanVessel}</b>\nStatus: <b>${statusInfo}</b>\nOpen Stacking: <b>${openStackInfo}</b>\n\nSistem akan memeriksa jadwal Open Stacking ${cleanPort.toUpperCase()} secara berkala dan mengirim notifikasi saat jadwal tersedia atau berubah.`;

      const waMsg = whatsappMessage.npct1VesselMonitoringEnabled(
        cleanVessel,
        statusInfo,
        openStackInfo,
        selected?.etb || "-",
        cleanPort
      );

      await Promise.all([
        sendTelegramMessage(telegramMsg).catch((e) =>
          console.error("Telegram notification failed:", e)
        ),
        cleanWaNumber
          ? sendWhatsappMessage(cleanWaNumber, waMsg).catch((e) =>
              console.error("WhatsApp notification failed:", e)
            )
          : Promise.resolve(),
      ]);
    }

    return {
      success: true,
      data: { message: returnMsg, trackingResult },
    };
  } catch (error) {
    console.error("enableVesselMonitoringAction Error:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Gagal mengaktifkan auto-monitoring kapal.",
    };
  }
}
