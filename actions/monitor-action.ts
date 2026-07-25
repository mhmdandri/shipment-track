"use server";

import prisma from "@/lib/prisma";
import { sendTelegramMessage } from "@/lib/telegram";
import { sendWhatsappMessage } from "@/lib/whatsapp";
import { whatsappMessage } from "@/lib/whatsapp-message";
import {
  checkWaSubscription,
  normalizeWaTargetId,
} from "@/lib/whatsapp/subscription";

import { z } from "zod";
import { ActionResponse } from "@/lib";

const enableMonitorSchema = z.object({
  containerNo: z.string().min(5),
  port: z.string().min(2),
  status: z.string(),
  waNumber: z.string().optional(),
  vesselName: z.string().optional(),
  voyageNo: z.string().optional(),
});

export async function enableTerminalMonitoring(
  containerNo: string,
  port: string,
  status: string,
  waNumber?: string,
  vesselName?: string,
  voyageNo?: string
): Promise<ActionResponse<{ message: string }>> {
  const parsed = enableMonitorSchema.safeParse({
    containerNo,
    port,
    status,
    waNumber,
    vesselName,
    voyageNo,
  });
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.errors.map((e) => e.message).join(", "),
    };
  }

  try {
    const cleanContainerNo = containerNo.trim().toUpperCase();
    const cleanPort = port.trim().toLowerCase();
    const rawWaNumber = waNumber?.trim() || "";
    const cleanWaNumber = rawWaNumber ? normalizeWaTargetId(rawWaNumber) : undefined;

    // Strict WhatsApp Subscription Check if waNumber is provided
    if (cleanWaNumber) {
      const existingForSubCheck = await prisma.terminalMonitor.findUnique({
        where: { containerNo: cleanContainerNo },
      });

      const isAlreadyActiveForSameTarget = Boolean(
        existingForSubCheck &&
          existingForSubCheck.isActive &&
          existingForSubCheck.waNumber &&
          normalizeWaTargetId(existingForSubCheck.waNumber) === cleanWaNumber
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
          errorMsg = `Kuota kontainer aktif WhatsApp telah penuh (${subCheck.activeContainersCount}/${subCheck.maxContainers}).`;
        }
        return { success: false, error: errorMsg };
      }
    }

    const existing = await prisma.terminalMonitor.findUnique({
      where: { containerNo: cleanContainerNo },
    });

    let messageSent = false;
    let returnMessage = "Monitoring enabled successfully.";

    await prisma.terminalMonitor.upsert({
      where: { containerNo: cleanContainerNo },
      update: {
        isActive: true,
        status: existing && existing.isActive ? undefined : status,
        port: existing && existing.isActive ? undefined : cleanPort,
        ...(cleanWaNumber ? { waNumber: cleanWaNumber } : {}),
        ...(vesselName ? { vesselName: vesselName.trim().toUpperCase() } : {}),
        ...(voyageNo ? { voyageNo: voyageNo.trim().toUpperCase() } : {}),
      },
      create: {
        containerNo: cleanContainerNo,
        port: cleanPort,
        status,
        waNumber: cleanWaNumber,
        vesselName: vesselName ? vesselName.trim().toUpperCase() : undefined,
        voyageNo: voyageNo ? voyageNo.trim().toUpperCase() : undefined,
        isActive: true,
      },
    });

    if (!existing || !existing.isActive) {
      messageSent = true;
    } else {
      returnMessage = "Container is already being monitored.";
    }

    if (messageSent) {
      const msg = whatsappMessage.monitoringEnabled(
        cleanContainerNo,
        cleanPort.toUpperCase(),
        status || "-"
      );
      const telegramMsg = `👁 <b>MONITORING STARTED</b> 👁\n\nContainer <code>${cleanContainerNo}</code> at <b>${cleanPort.toUpperCase()}</b> has been added to the watchlist.\n\nThe system will automatically check the yard allocation status every <b>30 minutes</b>. You will be notified as soon as it receives a yard location (GNSTK).`;

      // Execute notifications concurrently
      await Promise.all([
        sendTelegramMessage(telegramMsg).catch((e) =>
          console.error("Telegram notification failed:", e)
        ),
        cleanWaNumber
          ? sendWhatsappMessage(cleanWaNumber, msg).catch((e) =>
              console.error("WhatsApp notification failed:", e)
            )
          : Promise.resolve(),
      ]);
    }

    return { success: true, data: { message: returnMessage } };
  } catch (error) {
    console.error("Monitor Action Error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to enable monitoring.",
    };
  }
}

