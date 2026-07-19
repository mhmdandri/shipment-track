"use server";

import prisma from "@/lib/prisma";
import { sendTelegramMessage } from "@/lib/telegram";
import { sendWhatsappMessage } from "@/lib/whatsapp";

export async function enableTerminalMonitoring(
  containerNo: string,
  port: string,
  status: string,
  waNumber?: string,
  vesselName?: string,
  voyageNo?: string
) {
  if (!containerNo) {
    return { success: false, error: "Container number is required" };
  }

  try {
    const existing = await prisma.terminalMonitor.findUnique({
      where: { containerNo },
    });

    let messageSent = false;

    if (existing) {
      if (!existing.isActive) {
        await prisma.terminalMonitor.update({
          where: { containerNo },
          data: { 
            isActive: true, 
            status, 
            port,
            ...(waNumber ? { waNumber } : {}),
            ...(vesselName ? { vesselName } : {}),
            ...(voyageNo ? { voyageNo } : {})
          },
        });
        messageSent = true;
      } else {
        // If it's already active, optionally update the extra parameters if provided
        await prisma.terminalMonitor.update({
          where: { containerNo },
          data: { 
            ...(waNumber && existing.waNumber !== waNumber ? { waNumber } : {}),
            ...(vesselName && existing.vesselName !== vesselName ? { vesselName } : {}),
            ...(voyageNo && existing.voyageNo !== voyageNo ? { voyageNo } : {})
          }
        });
        return {
          success: true,
          message: "Container is already being monitored.",
        };
      }
    } else {
      await prisma.terminalMonitor.create({
        data: {
          containerNo,
          port,
          status,
          waNumber,
          vesselName,
          voyageNo,
          isActive: true,
        },
      });
      messageSent = true;
    }

    if (messageSent) {
      const msg = `👁 *MONITORING STARTED* 👁\n\nContainer *${containerNo}* at *${port.toUpperCase()}* has been added to the watchlist.\n\nThe system will automatically check the yard allocation status every *30 minutes*. You will be notified as soon as it receives a yard location (GNSTK).`;
      
      const telegramMsg = `👁 <b>MONITORING STARTED</b> 👁\n\nContainer <code>${containerNo}</code> at <b>${port.toUpperCase()}</b> has been added to the watchlist.\n\nThe system will automatically check the yard allocation status every <b>30 minutes</b>. You will be notified as soon as it receives a yard location (GNSTK).`;
      
      await sendTelegramMessage(telegramMsg);
      
      if (waNumber) {
        await sendWhatsappMessage(waNumber, msg);
      }
    }

    return { success: true, message: "Monitoring enabled successfully." };
  } catch (error) {
    console.error("Monitor Action Error:", error);
    return { success: false, error: "Failed to enable monitoring." };
  }
}
