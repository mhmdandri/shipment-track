import cron from "node-cron";
import dotenv from "dotenv";
dotenv.config();

import { PrismaClient } from "../app/generated/prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
async function sendTelegramMessage(text: string) {
  const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return false;
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text,
        parse_mode: "HTML",
      }),
    });
    return true;
  } catch (e) {
    console.error("Telegram error:", e);
    return false;
  }
}

async function checkJictContainer(containerNo: string) {
  try {
    const params = new URLSearchParams();
    params.set("container", containerNo);
    params.set("type", "I");

    const response = await fetch("https://www.jict.co.id/container-tracking-search", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    if (!response.ok) return null;
    const data = await response.json();
    
    if (Array.isArray(data) && data[0] === "00") {
      return {
        status: data[20],
        time: data[32],
      };
    }
    return null;
  } catch (err) {
    console.error(`Error checking JICT for ${containerNo}:`, err);
    return null;
  }
}

async function runMonitor() {
  console.log(`[${new Date().toISOString()}] Running terminal monitor check...`);
  try {
    const activeMonitors = await prisma.terminalMonitor.findMany({
      where: { isActive: true },
    });

    for (const monitor of activeMonitors) {
      if (monitor.port.toLowerCase() === "jict") {
        const result = await checkJictContainer(monitor.containerNo);
        if (result && result.status === "GNSTK") {
          console.log(`Container ${monitor.containerNo} is now GNSTK!`);
          
          // Update database
          await prisma.terminalMonitor.update({
            where: { id: monitor.id },
            data: { isActive: false, status: "GNSTK", updatedAt: new Date() },
          });

          // Send Telegram notification
          const msg = `🚨 <b>YARD ALLOCATION UPDATE</b> 🚨\n\nContainer <code>${monitor.containerNo}</code> at <b>JICT</b> has received a yard allocation!\nStatus: <b>GNSTK</b>\nTime: ${result.time}\n\nPlease proceed with the next operational steps.`;
          await sendTelegramMessage(msg);
        }
      }
    }
  } catch (error) {
    console.error("Monitor cron error:", error);
  }
}

// Run every 2 hours
// "0 */2 * * *" means every 2 hours at minute 0
console.log("Starting Container Monitor Cron Job (runs every 2 hours)...");
cron.schedule("0 */2 * * *", runMonitor);

// For testing purposes, we also run it immediately on startup
runMonitor();
