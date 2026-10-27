import prisma from "@/lib/prisma";
import { ActionResponse } from "@/lib";
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
 * Terminal container monitoring business logic.
 *
 * IMPORTANT: This module intentionally has NO "use server" directive.
 * Functions here perform no session auth and must only be called from
 * trusted server code (auth-guarded Server Actions, cron, WhatsApp bot handlers).
 * Exporting them from a "use server" file would expose them as public endpoints.
 */

const enableMonitorSchema = z.object({
  containerNo: z.string().trim().min(5).max(15),
  port: z.enum(["jict", "koja", "npct1", "tmal", "ter3", "parama"]),
  status: z.string().trim().max(100),
  waNumber: z.string().trim().max(100).optional(),
  vesselName: z.string().trim().max(150).optional(),
  voyageNo: z.string().trim().max(50).optional(),
});

export async function enableTerminalMonitoringInternal(
  containerNo: string,
  port: string,
  status: string,
  waNumber?: string,
  vesselName?: string,
  voyageNo?: string,
  time?: string,
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
    const cleanPort = port.trim().toLowerCase() as z.infer<typeof enableMonitorSchema>["port"];
    const rawWaNumber = waNumber?.trim() || "";
    const cleanWaNumber = rawWaNumber ? normalizeWaTargetId(rawWaNumber) : undefined;

    // Single lookup reused for subscription check & upsert decision
    let messageSent = false;
    let returnMessage = "Monitoring enabled successfully.";

    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${cleanWaNumber || cleanContainerNo}))`;
      const existing = await tx.terminalMonitor.findUnique({
        where: { containerNo: cleanContainerNo },
      });

      if (cleanWaNumber) {
        const isAlreadyActiveForSameTarget = Boolean(
          existing?.isActive &&
            existing.waNumber &&
            normalizeWaTargetId(existing.waNumber) === cleanWaNumber,
        );
        const subCheck = await checkWaSubscription(
          cleanWaNumber,
          isAlreadyActiveForSameTarget ? 0 : 1,
          undefined,
          tx,
        );
        if (!subCheck.allowed) {
          throw new Error(formatSubscriptionErrorMessage(subCheck, rawWaNumber));
        }
      }

      await tx.terminalMonitor.upsert({
        where: { containerNo: cleanContainerNo },
        update: {
          isActive: true,
          status: existing?.isActive ? undefined : status,
          port: existing?.isActive ? undefined : cleanPort,
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
    });

    if (messageSent) {
      const msg = whatsappMessage.monitoringEnabled(
        cleanContainerNo,
        cleanPort.toUpperCase(),
        status || "-",
        time,
      );
      const telegramMsg = `👁 <b>MONITORING STARTED</b> 👁\n\nContainer <code>${cleanContainerNo}</code> at <b>${cleanPort.toUpperCase()}</b> has been added to the watchlist.\n\nThe system will automatically check the yard allocation status every <b>30 minutes</b>. You will be notified as soon as it receives a yard location (GNSTK).\n\n🕒 Waktu: <b>${time && time !== "-" ? time : "-"}</b>`;

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
