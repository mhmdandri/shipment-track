import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { trackTerminalContainer } from "@/actions/terminal-track-action";
import { sendTelegramMessage } from "@/lib/telegram";
import { sendWhatsappMessage } from "@/lib/whatsapp";
import { whatsappMessage } from "@/lib/whatsapp-message";

// This forces Next.js to not cache the response of this route
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // Vercel Cron sends a Bearer token in the Authorization header to verify the request
  // It matches process.env.CRON_SECRET automatically on Vercel deployments.
  const authHeader = request.headers.get("authorization");

  // Note: Only enforce this if CRON_SECRET is defined. This allows local testing via browser.
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const activeMonitors = await prisma.terminalMonitor.findMany({
      where: { isActive: true },
    });

    if (activeMonitors.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No active monitors.",
      });
    }

    const processed = [];

    for (const monitor of activeMonitors) {
      const result = await trackTerminalContainer(
        monitor.port,
        monitor.containerNo,
        monitor.vesselName || undefined,
        monitor.voyageNo || undefined,
      );

      const isOb =
        (result.ob?.length ?? 0) > 0 &&
        ((result.ob?.toUpperCase().includes("PLP") ||
          result.ob?.toUpperCase().includes("OBX")) ??
          false);
      let newStatus = result.status || "UNKNOWN";

      // Append (OB) to status so it's treated as a new change when OB appears
      if (isOb && !newStatus.includes("(OB)")) {
        newStatus = `${newStatus} (OB)`;
      }

      if (
        result.success &&
        newStatus !== monitor.status &&
        newStatus !== "UNKNOWN"
      ) {
        // Status has changed!

        // Determine if it's Outgate
        const upperStatus = newStatus.toUpperCase();
        const isOutgate =
          ["OUTGATE", "GATE OUT", "GATEOUT", "OUTGT", "DELIVERED"].some((s) =>
            upperStatus.includes(s),
          ) && !upperStatus.includes("PLANNING");

        // Update database
        await prisma.terminalMonitor.update({
          where: { id: monitor.id },
          data: {
            status: newStatus,
            isActive: !isOutgate,
            updatedAt: new Date(),
          },
        });

        // Telegram Logic: Only send when it hits GNSTK for the first time
        if (newStatus.startsWith("GNSTK") && !monitor.status.startsWith("GNSTK")) {
          const telegramMsg = `🚨 <b>YARD ALLOCATION UPDATE</b> 🚨\n\nContainer <code>${monitor.containerNo}</code> at <b>${monitor.port.toUpperCase()}</b> has received a yard allocation!\nStatus: <b>${newStatus}</b>\nTime: ${result.time || "N/A"}\n\nPlease proceed with the next operational steps.`;
          await sendTelegramMessage(telegramMsg);
        }

        // WhatsApp Logic: Every change
        const hasil = isOutgate
          ? result.timeOut || result.time || "-"
          : result.time || "-";
        if (monitor.waNumber) {
          if (isOutgate) {
            const waMsg = whatsappMessage.outgate(
              monitor.containerNo,
              monitor.port,
              hasil,
            );
            await sendWhatsappMessage(monitor.waNumber, waMsg);
          } else if (isOb) {
            const waMsg = whatsappMessage.changedToOb(
              monitor.containerNo,
              monitor.port,
              result.status || "UNKNOWN",
              result.ob,
              result.obName,
            );
            await sendWhatsappMessage(monitor.waNumber, waMsg);
          } else if (newStatus.startsWith("GNSTK")) {
            const waMsg = whatsappMessage.statusChangedToGNSTK(
              monitor.containerNo,
              monitor.port,
              result.time || "-",
            );
            console.error(waMsg);
            await sendWhatsappMessage(monitor.waNumber, waMsg);
          } else {
            const waMsg = whatsappMessage.statusChanged(
              monitor.containerNo,
              monitor.port,
              monitor.status,
              newStatus,
              result.time || "-",
            );
            await sendWhatsappMessage(monitor.waNumber, waMsg);
          }
        }

        processed.push({
          containerNo: monitor.containerNo,
          status: `Updated to ${newStatus} (isActive: ${!isOutgate})`,
        });
      } else {
        processed.push({
          containerNo: monitor.containerNo,
          status: result.status || "Unchanged",
        });
      }
    }
    return NextResponse.json({
      success: true,
      message: "Cron job executed successfully.",
      details: processed,
    });
  } catch (error) {
    console.error("Vercel Cron Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
