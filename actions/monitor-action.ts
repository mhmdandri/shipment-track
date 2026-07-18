"use server";

import prisma from "@/lib/prisma";
import { sendTelegramMessage } from "@/lib/telegram";

export async function enableTerminalMonitoring(
  containerNo: string,
  port: string,
  status: string
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
          data: { isActive: true, status, port },
        });
        messageSent = true;
      } else {
        return { success: true, message: "Container is already being monitored." };
      }
    } else {
      await prisma.terminalMonitor.create({
        data: {
          containerNo,
          port,
          status,
          isActive: true,
        },
      });
      messageSent = true;
    }

    if (messageSent) {
      const msg = `👁 <b>MONITORING STARTED</b> 👁\n\nContainer <code>${containerNo}</code> at <b>${port.toUpperCase()}</b> has been added to the watchlist.\n\nThe system will automatically check the yard allocation status every <b>2 hours</b>. You will be notified as soon as it receives a yard location (GNSTK).`;
      await sendTelegramMessage(msg);
    }

    return { success: true, message: "Monitoring enabled successfully." };
  } catch (error) {
    console.error("Monitor Action Error:", error);
    return { success: false, error: "Failed to enable monitoring." };
  }
}
