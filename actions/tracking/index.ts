import prisma from "@/lib/prisma";
import { jictTracker } from "./ports/jict";
import { kojaTracker } from "./ports/koja";
import { npct1Tracker } from "./ports/npct1";
import { ter3Tracker } from "./ports/ter3";
import { tmalTracker } from "./ports/tmal";
import { PortTracker, TerminalTrackingResult, trackInputSchema } from "./types";

export const trackers: Record<string, PortTracker> = {
  jict: jictTracker,
  tmal: tmalTracker,
  koja: kojaTracker,
  npct1: npct1Tracker,
  ter3: ter3Tracker,
  parama: ter3Tracker,
};

export async function checkIsMonitored(containerNo: string): Promise<boolean> {
  try {
    const existing = await prisma.terminalMonitor.findUnique({
      where: { containerNo },
    });
    return Boolean(existing && existing.isActive);
  } catch (error) {
    console.error("Error checking monitor status:", error);
    return false;
  }
}

export async function trackTerminalContainer(
  port: string,
  containerNo: string,
  vesselName?: string,
  voyageNo?: string
): Promise<TerminalTrackingResult> {
  const parsed = trackInputSchema.safeParse({
    port,
    containerNo,
    vesselName,
    voyageNo,
  });

  if (!parsed.success) {
    return {
      success: false,
      port,
      containerNo,
      error: parsed.error.errors.map((e) => e.message).join(", "),
    };
  }

  const normalizedPort = port.toLowerCase();
  const isMonitored = await checkIsMonitored(parsed.data.containerNo);

  try {
    const tracker = trackers[normalizedPort];
    if (!tracker) {
      return {
        success: false,
        port,
        containerNo: parsed.data.containerNo,
        error: `Tracking for port ${port.toUpperCase()} is not implemented yet.`,
        isMonitored,
      };
    }

    const result = await tracker.track(parsed.data);

    return {
      ...result,
      isMonitored,
    };
  } catch (error) {
    console.error(`Terminal Tracking Error (${port}):`, error);
    return {
      success: false,
      port,
      containerNo: parsed.data.containerNo,
      error:
        error instanceof Error
          ? error.message
          : "An unexpected error occurred.",
      isMonitored,
    };
  }
}

export * from "./types";
