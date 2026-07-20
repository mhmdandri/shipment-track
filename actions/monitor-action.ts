"use server";

import prisma from "@/lib/prisma";
import { sendTelegramMessage } from "@/lib/telegram";
import { sendWhatsappMessage } from "@/lib/whatsapp";

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
  
  const parsed = enableMonitorSchema.safeParse({ containerNo, port, status, waNumber, vesselName, voyageNo });
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors.map(e => e.message).join(", ") };
  }

  try {
    const existing = await prisma.terminalMonitor.findUnique({
      where: { containerNo },
    });

    let messageSent = false;
    let returnMessage = "Monitoring enabled successfully.";

    // We still check existing here because we need to know whether to send the "Monitoring Started" broadcast
    // But we use upsert for atomic database writes
    await prisma.terminalMonitor.upsert({
      where: { containerNo },
      update: {
        isActive: true,
        status: existing && existing.isActive ? undefined : status, // keep existing status if already active
        port: existing && existing.isActive ? undefined : port,
        ...(waNumber ? { waNumber } : {}),
        ...(vesselName ? { vesselName } : {}),
        ...(voyageNo ? { voyageNo } : {}),
      },
      create: {
        containerNo,
        port,
        status,
        waNumber,
        vesselName,
        voyageNo,
        isActive: true,
      }
    });

    if (!existing || !existing.isActive) {
      messageSent = true;
    } else {
      returnMessage = "Container is already being monitored.";
    }

    if (messageSent) {
      const msg = `👁 *MONITORING STARTED* 👁\n\nContainer *${containerNo}* at *${port.toUpperCase()}* has been added to the watchlist.\n\nThe system will automatically check the yard allocation status every *30 minutes*. You will be notified as soon as it receives a yard location (GNSTK).`;
      const telegramMsg = `👁 <b>MONITORING STARTED</b> 👁\n\nContainer <code>${containerNo}</code> at <b>${port.toUpperCase()}</b> has been added to the watchlist.\n\nThe system will automatically check the yard allocation status every <b>30 minutes</b>. You will be notified as soon as it receives a yard location (GNSTK).`;
      
      // Execute notifications concurrently
      await Promise.all([
        sendTelegramMessage(telegramMsg).catch(e => console.error("Telegram notification failed:", e)),
        waNumber ? sendWhatsappMessage(waNumber, msg).catch(e => console.error("WhatsApp notification failed:", e)) : Promise.resolve(),
      ]);
    }

    return { success: true, data: { message: returnMessage } };
  } catch (error) {
    console.error("Monitor Action Error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to enable monitoring." };
  }
}
