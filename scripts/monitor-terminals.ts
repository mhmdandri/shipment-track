import cron from "node-cron";
import dotenv from "dotenv";
dotenv.config();

import { PrismaClient } from "../app/generated/prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { trackTerminalContainer } from "../actions/terminal-track-action";
import { sendTelegramMessage } from "../lib/telegram";
import { sendWhatsappMessage } from "../lib/whatsapp";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function runMonitor() {
  console.log(`[${new Date().toISOString()}] Running terminal monitor check...`);
  try {
    const activeMonitors = await prisma.terminalMonitor.findMany({
      where: { isActive: true },
    });

    if (activeMonitors.length === 0) {
      console.log("No active monitors.");
      return;
    }

    for (const monitor of activeMonitors) {
      const result = await trackTerminalContainer(
        monitor.port,
        monitor.containerNo,
        monitor.vesselName || undefined,
        monitor.voyageNo || undefined
      );

      const isGnstkExact = result.status === "GNSTK";
      const isUnknownPortChange = 
        monitor.port === "koja" && 
        result.status && result.status !== "ONVSL" && result.status !== monitor.status;

      if (result.success && (isGnstkExact || isUnknownPortChange)) {
        const finalStatus = isGnstkExact ? "GNSTK" : result.status!;
        
        await prisma.terminalMonitor.update({
          where: { id: monitor.id },
          data: { isActive: false, status: finalStatus, updatedAt: new Date() },
        });

        const telegramMsg = `🚨 <b>YARD ALLOCATION UPDATE</b> 🚨\n\nContainer <code>${monitor.containerNo}</code> at <b>${monitor.port.toUpperCase()}</b> has received a yard allocation!\nStatus: <b>${finalStatus}</b>\nTime: ${result.time || "N/A"}\n\nPlease proceed with the next operational steps.`;
        await sendTelegramMessage(telegramMsg);

        if (monitor.waNumber) {
          const waMsg = `🚨 *YARD ALLOCATION UPDATE* 🚨\n\nContainer *${monitor.containerNo}* di *${monitor.port.toUpperCase()}* sepertinya sudah turun ke yard!\nStatus Baru: *${finalStatus}*\nWaktu: ${result.time || "-"}\n\nSilakan periksa langkah operasional selanjutnya.`;
          await sendWhatsappMessage(monitor.waNumber, waMsg);
        }

        console.log(`Container ${monitor.containerNo} updated to ${finalStatus}`);
      } else {
        console.log(`Container ${monitor.containerNo} status: ${result.status || "Unchanged"}`);
      }
    }
  } catch (error) {
    console.error("Monitor cron error:", error);
  }
}

console.log("Starting Container Monitor Cron Job (runs every 30 minutes)...");
cron.schedule("*/30 * * * *", runMonitor);

runMonitor();
