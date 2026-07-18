import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { trackTerminalContainer } from "@/actions/terminal-track-action";
import { sendTelegramMessage } from "@/lib/telegram";
import { sendWhatsappMessage } from "@/lib/whatsapp";

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
      );

      if (result.success && result.status === "GNSTK") {
        // Update database
        await prisma.terminalMonitor.update({
          where: { id: monitor.id },
          data: { isActive: false, status: "GNSTK", updatedAt: new Date() },
        });

        // Send Telegram notification
        const telegramMsg = `🚨 <b>YARD ALLOCATION UPDATE</b> 🚨\n\nContainer <code>${monitor.containerNo}</code> at <b>${monitor.port.toUpperCase()}</b> has received a yard allocation!\nStatus: <b>GNSTK</b>\nTime: ${result.time || "N/A"}\n\nPlease proceed with the next operational steps.`;
        await sendTelegramMessage(telegramMsg);

        // Send WhatsApp notification if number is present
        if (monitor.waNumber) {
          const waMsg = `🚨 *YARD ALLOCATION UPDATE* 🚨\n\nContainer *${monitor.containerNo}* at *${monitor.port.toUpperCase()}* has received a yard allocation!\nStatus: *GNSTK*\nTime: ${result.time || "N/A"}\n\nPlease proceed with the next operational steps.`;
          await sendWhatsappMessage(monitor.waNumber, waMsg);
        }

        processed.push({
          containerNo: monitor.containerNo,
          status: "Updated to GNSTK",
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
