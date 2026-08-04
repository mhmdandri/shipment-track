import { VesselTracker, VesselTrackingResult, VesselScheduleItem } from "./types";
import { filterAndSelectBestSchedules } from "./helpers";
import { npct1VesselTracker } from "./ports/npct1";
import { jictVesselTracker } from "./ports/jict";
import { kojaVesselTracker } from "./ports/koja";
import { tmalVesselTracker } from "./ports/tmal";
import { ter3VesselTracker } from "./ports/ter3";

export const vesselTrackers: Record<string, VesselTracker> = {
  jict: jictVesselTracker,
  npct1: npct1VesselTracker,
  koja: kojaVesselTracker,
  tmal: tmalVesselTracker,
  ter3: ter3VesselTracker,
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

export * from "./helpers";

export interface MultiPortVesselResult {
  vesselNameQuery: string;
  totalFound: number;
  vessels: VesselScheduleItem[];
  errors: Array<{ port: string; error: string }>;
}

export async function searchVesselAllPorts(
  vesselName: string
): Promise<MultiPortVesselResult> {
  const query = vesselName.trim();
  if (!query) {
    return { vesselNameQuery: "", totalFound: 0, vessels: [], errors: [] };
  }

  const ports = Object.keys(vesselTrackers);
  const results = await Promise.allSettled(
    ports.map(async (portKey) => {
      const tracker = vesselTrackers[portKey];
      const res = await tracker.trackVessel(query);
      return {
        portKey,
        res,
      };
    })
  );

  const rawSchedules: VesselScheduleItem[] = [];
  const errors: Array<{ port: string; error: string }> = [];

  results.forEach((r, index) => {
    const portKey = ports[index];
    if (r.status === "fulfilled") {
      const { res } = r.value;
      if (res.success && res.schedules && res.schedules.length > 0) {
        const itemsWithPort = res.schedules.map((s) => ({
          ...s,
          port: s.port || res.port || portKey,
          eta: s.eta || s.etb || null,
          etb: s.etb || s.eta || null,
        }));
        rawSchedules.push(...itemsWithPort);
      } else if (res.error) {
        errors.push({ port: portKey, error: res.error });
      }
    } else {
      errors.push({ port: portKey, error: r.reason?.message || "Failed to fetch" });
    }
  });

  // Filter and select ONLY the best / newest active upcoming schedule(s)
  const bestVessels = filterAndSelectBestSchedules(rawSchedules);

  return {
    vesselNameQuery: query,
    totalFound: bestVessels.length,
    vessels: bestVessels,
    errors,
  };
}

export * from "./types";
