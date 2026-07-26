import { VesselTracker, VesselTrackingResult } from "./types";
import { npct1VesselTracker } from "./ports/npct1";
import { jictVesselTracker } from "./ports/jict";

export const vesselTrackers: Record<string, VesselTracker> = {
  npct1: npct1VesselTracker,
  jict: jictVesselTracker,
};

export async function trackVesselSchedule(
  port: string,
  vesselName: string,
  line?: string
): Promise<VesselTrackingResult> {
  const cleanPort = port.trim().toLowerCase();
  const tracker = vesselTrackers[cleanPort];

  if (!tracker) {
    return {
      success: false,
      port: cleanPort,
      vesselName,
      schedules: [],
      selectedSchedule: null,
      error: `Pengecekan jadwal kapal untuk terminal "${cleanPort.toUpperCase()}" belum didukung.`,
    };
  }

  return tracker.trackVessel(vesselName, line);
}

export * from "./types";
