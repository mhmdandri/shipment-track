import cron from "node-cron";
import dotenv from "dotenv";
dotenv.config();

import {
  processContainerMonitors,
  processVesselMonitors,
} from "../service/cron-monitor-service";

async function runMonitor() {
  const startTime = Date.now();
  console.log(`[${new Date().toISOString()}] Running terminal & vessel monitor check...`);
  try {
    const [containerResults, vesselResults] = await Promise.all([
      processContainerMonitors(),
      processVesselMonitors(),
    ]);

    const durationMs = Date.now() - startTime;
    console.log(
      `Processed ${containerResults.length} container monitor(s) and ${vesselResults.length} vessel monitor(s) in ${durationMs}ms.`
    );
  } catch (error) {
    console.error("Monitor cron error:", error);
  }
}

console.log("Starting Terminal & Vessel Monitor Cron Job (runs every 30 minutes)...");
cron.schedule("*/30 * * * *", runMonitor);

runMonitor();
