import cron from "node-cron";
import dotenv from "dotenv";
dotenv.config();

import {
  processContainerMonitors,
  processVesselMonitors,
} from "../service/cron-monitor-service";

async function runMonitor() {
  console.log(`[${new Date().toISOString()}] Running terminal & vessel monitor check...`);
  try {
    const [containerResults, vesselResults] = await Promise.all([
      processContainerMonitors(),
      processVesselMonitors(),
    ]);

    console.log(
      `Processed ${containerResults.length} container monitor(s) and ${vesselResults.length} vessel monitor(s).`
    );
  } catch (error) {
    console.error("Monitor cron error:", error);
  }
}

console.log("Starting Terminal & Vessel Monitor Cron Job (runs every 30 minutes)...");
cron.schedule("*/30 * * * *", runMonitor);

runMonitor();
