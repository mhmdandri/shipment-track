import { VesselTracker, VesselTrackingResult, VesselScheduleItem } from "./types";
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

/**
 * Parses any date format (YYYY-MM-DD, DD-MM-YYYY, MM/DD/YYYY, DD/MM/YYYY) into timestamp MS.
 */
export function parseVesselDateMs(dateStr: string | null | undefined): number {
  if (!dateStr || dateStr === "-" || dateStr.trim() === "") return 0;
  const clean = dateStr.trim();

  // 1. YYYY-MM-DD HH:mm:ss
  if (/^\d{4}-\d{2}-\d{2}/.test(clean)) {
    const t = new Date(clean.replace(" ", "T")).getTime();
    if (!isNaN(t)) return t;
  }

  // 2. DD-MM-YYYY HH:mm:ss (TMAL)
  const dmyDashMatch = clean.match(/^(\d{2})-(\d{2})-(\d{4})(?:\s+(\d{2}:\d{2}(?::\d{2})?))?/);
  if (dmyDashMatch) {
    const [, day, month, year, time] = dmyDashMatch;
    const iso = `${year}-${month}-${day}T${time || "00:00:00"}`;
    const t = new Date(iso).getTime();
    if (!isNaN(t)) return t;
  }

  // 3. Slashing format MM/DD/YYYY (TER3) or DD/MM/YYYY
  const slashMatch = clean.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{2}:\d{2}(?::\d{2})?))?/);
  if (slashMatch) {
    const [, p1, p2, year, time] = slashMatch;
    const n1 = parseInt(p1, 10);
    const n2 = parseInt(p2, 10);

    // If p2 > 12 -> p2 is Day -> MM/DD/YYYY (e.g. TER3 "07/30/2026")
    if (n2 > 12) {
      const iso = `${year}-${p1.padStart(2, "0")}-${p2.padStart(2, "0")}T${time || "00:00:00"}`;
      const t = new Date(iso).getTime();
      if (!isNaN(t)) return t;
    }
    // If p1 > 12 -> p1 is Day -> DD/MM/YYYY (e.g. JICT "29/07/2026")
    else if (n1 > 12) {
      const iso = `${year}-${p2.padStart(2, "0")}-${p1.padStart(2, "0")}T${time || "00:00:00"}`;
      const t = new Date(iso).getTime();
      if (!isNaN(t)) return t;
    }
    // Default MM/DD/YYYY
    else {
      const iso1 = `${year}-${p1.padStart(2, "0")}-${p2.padStart(2, "0")}T${time || "00:00:00"}`;
      const t1 = new Date(iso1).getTime();
      if (!isNaN(t1)) return t1;
    }
  }

  const fallbackMs = Date.parse(clean);
  return isNaN(fallbackMs) ? 0 : fallbackMs;
}

/**
 * Filters and selects the single newest / active / upcoming schedule(s) for the current vessel voyage,
 * discarding ancient past completed entries if an active/upcoming schedule exists.
 */
export function filterAndSelectBestSchedules(
  schedules: VesselScheduleItem[]
): VesselScheduleItem[] {
  if (!schedules || schedules.length === 0) return [];

  const nowMs = Date.now();
  const yesterdayMs = nowMs - 24 * 60 * 60 * 1000;

  const getMs = (s: VesselScheduleItem): number => {
    return (
      parseVesselDateMs(s.eta) ||
      parseVesselDateMs(s.etb) ||
      parseVesselDateMs(s.openStacking) ||
      parseVesselDateMs(s.etd) ||
      0
    );
  };

  const isCompleted = (s: VesselScheduleItem): boolean => {
    const st = (s.status || "").toUpperCase();
    if (
      ["FINISH", "SAIL", "COMPLETE", "DEPART", "LEAVING", "OUTGT"].some((k) =>
        st.includes(k)
      )
    ) {
      return true;
    }
    const ms = getMs(s);
    return ms > 0 && ms < nowMs - 3 * 24 * 60 * 60 * 1000;
  };

  // Check if any active/upcoming schedule exists
  const activeUpcoming = schedules.filter(
    (s) => !isCompleted(s) && getMs(s) >= yesterdayMs
  );

  const pool = activeUpcoming.length > 0 ? activeUpcoming : schedules;

  // Group by (port + ":" + voyage) to deduplicate exact same voyage at the same port
  const voyageMap = new Map<string, VesselScheduleItem>();

  pool.forEach((s) => {
    const cleanPort = (s.port || "").toLowerCase().trim();
    const cleanVoy = (s.voyIn || s.voyOut || s.vessel || "")
      .toUpperCase()
      .trim();
    const voyKey = `${cleanPort}:${cleanVoy}`;

    if (!voyageMap.has(voyKey)) {
      voyageMap.set(voyKey, s);
    } else {
      const existing = voyageMap.get(voyKey)!;
      // Prefer schedule with clearer ETB/ETA date
      if (getMs(s) > getMs(existing)) {
        voyageMap.set(voyKey, s);
      }
    }
  });

  const selectedList = Array.from(voyageMap.values());

  // Sort: future upcoming dates closest to current date first
  return selectedList.sort((a, b) => {
    const msA = getMs(a);
    const msB = getMs(b);
    const isFutA = msA >= yesterdayMs ? 1 : 0;
    const isFutB = msB >= yesterdayMs ? 1 : 0;

    if (isFutA !== isFutB) return isFutB - isFutA; // Upcoming first
    if (isFutA && isFutB) return msA - msB; // Closest upcoming date first (e.g. 28 July before 15 August)
    return msB - msA; // Newest past date
  });
}

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
