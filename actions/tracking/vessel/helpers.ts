import { VesselScheduleItem } from "./types";

export const SAILING_COMPLETED_KEYWORDS = [
  "SAILED",
  "SAILING",
  "COMPLETED",
  "COMPLETE",
  "FINISH",
  "FINISHED",
  "DEPARTED",
  "DEPART",
  "LEFT",
  "LEAVING",
];

export const ACTIVE_VESSEL_KEYWORDS = [
  "BERTH",
  "BERTHING",
  "WORKING",
  "SCHEDULED",
  "OPEN STACK",
  "OPENSTACK",
  "ANCHORAGE",
  "PORT",
  "ARRIVED",
  "STACKING",
  "YARD",
  "PLAN",
  "REGISTER",
  "ACTIVE",
  "DISCHARGE",
  "LOADING",
];

/**
 * Helper to check if a vessel's status indicates it has already departed, sailed, or completed its port call.
 * Respects active vessel status keywords so ships with past ETDs but active berthing/working status are NOT marked as sailed.
 */
export function isVesselSailingOrCompleted(
  status: string | null | undefined,
  etd?: string | Date | null
): boolean {
  if (status) {
    const statusUpper = status.trim().toUpperCase();

    // 1. Explicit active status keywords take precedence — ship is NOT sailing if status is active
    if (ACTIVE_VESSEL_KEYWORDS.some((keyword) => statusUpper.includes(keyword))) {
      return false;
    }

    // 2. Explicit sailing/completed keywords
    if (SAILING_COMPLETED_KEYWORDS.some((keyword) => statusUpper.includes(keyword))) {
      return true;
    }
  }

  // 3. Fallback to ETD check only when status is absent or ambiguous, with a 48h safety window
  if (etd) {
    let etdMs = 0;
    if (etd instanceof Date) {
      etdMs = etd.getTime();
    } else if (typeof etd === "string") {
      etdMs = parseVesselDateMs(etd);
    }

    if (etdMs > 0) {
      const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000;
      if (Date.now() - etdMs > FORTY_EIGHT_HOURS_MS) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Parses any date format (YYYY-MM-DD, DD-MM-YYYY, MM/DD/YYYY, DD/MM/YYYY) into timestamp MS.
 * Prefers DD/MM/YYYY format for slash dates in Indonesian terminal context.
 */
export function parseVesselDateMs(dateStr: string | null | undefined): number {
  if (!dateStr || dateStr === "-" || dateStr.trim() === "") return 0;
  const clean = dateStr.trim();

  // 1. YYYY-MM-DD HH:mm:ss
  const isoMatch = clean.match(/^(\d{4})-(\d{2})-(\d{2})(?:\s+(\d{2}:\d{2}(?::\d{2})?))?/);
  if (isoMatch) {
    const [, year, month, day, time] = isoMatch;
    const iso = `${year}-${month}-${day}T${time || "00:00:00"}`;
    const t = new Date(iso).getTime();
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

  // 3. Slashing format DD/MM/YYYY (Indonesian standard) or MM/DD/YYYY
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
    // Default to DD/MM/YYYY (Day = p1, Month = p2) for Indonesian domestic port standards
    else {
      const iso1 = `${year}-${p2.padStart(2, "0")}-${p1.padStart(2, "0")}T${time || "00:00:00"}`;
      const t1 = new Date(iso1).getTime();
      if (!isNaN(t1)) return t1;
    }
  }

  const fallbackMs = Date.parse(clean);
  return isNaN(fallbackMs) ? 0 : fallbackMs;
}

export function parseVesselDate(dateStr: string | null | undefined): Date | null {
  const ms = parseVesselDateMs(dateStr);
  return ms > 0 ? new Date(ms) : null;
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
    if (isVesselSailingOrCompleted(s.status, s.etd)) {
      return true;
    }
    // If status is not SAILED/completed, consider it completed only if ETD/ETA is older than 7 days
    const etdMs = parseVesselDateMs(s.etd) || parseVesselDateMs(s.atd);
    const dateMs = etdMs || getMs(s);
    return dateMs > 0 && dateMs < nowMs - 7 * 24 * 60 * 60 * 1000;
  };

  // Filter active/upcoming schedules
  let pool = schedules.filter((s) => !isCompleted(s));

  // Fallback: if all schedules were filtered out, keep the schedule with the latest date
  if (pool.length === 0) {
    pool = [...schedules].sort((a, b) => getMs(b) - getMs(a)).slice(0, 1);
  }

  // Group by (port + ":" + voyage) to deduplicate exact same voyage at the same port
  const voyageMap = new Map<string, VesselScheduleItem>();

  pool.forEach((s) => {
    const cleanPort = (s.port || "").toLowerCase().trim();
    const rawVoy = (s.voyIn || s.voyOut || "").toUpperCase().trim();
    const cleanVoy = rawVoy || `${(s.vessel || "").toUpperCase().trim()}:${getMs(s)}`;
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
    if (isFutA && isFutB) return msA - msB; // Closest upcoming date first
    return msB - msA; // Newest past date
  });
}

/**
 * Returns the single best / earliest upcoming schedule from a list of vessel schedules.
 */
export function selectSingleBestSchedule(
  schedules: VesselScheduleItem[]
): VesselScheduleItem | null {
  if (!schedules || schedules.length === 0) return null;
  const bestList = filterAndSelectBestSchedules(schedules);
  return bestList[0] || null;
}

/**
 * Accurately matches a target voyage number against schedule voyIn / voyOut.
 * Handles variations such as prefixes, slashes, whitespace, and leading zeros.
 * Prevents false positives where short numbers match unrelated voyages.
 */
export function isVoyageMatch(
  targetVoyage: string | null | undefined,
  voyIn: string | null | undefined,
  voyOut?: string | null | undefined
): boolean {
  if (!targetVoyage) return false;
  const targetClean = targetVoyage.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!targetClean) return false;

  const candidates = [voyIn, voyOut]
    .filter((v): v is string => Boolean(v && v.trim()))
    .map((v) => v.trim().toLowerCase().replace(/[^a-z0-9]/g, ""))
    .filter((v) => v.length > 0);

  if (candidates.length === 0) return false;

  const targetNoZero = targetClean.replace(/^0+/, "");

  for (const cand of candidates) {
    if (cand === targetClean) return true;

    // Check with leading zeros stripped (e.g., "025N" vs "25N")
    const candNoZero = cand.replace(/^0+/, "");
    if (
      candNoZero.length > 0 &&
      (candNoZero === targetNoZero || candNoZero === targetClean || cand === targetNoZero)
    ) {
      return true;
    }

    // Candidate contains target (e.g. candidate "CARITA-025N" or "025N/025S" contains target "025N")
    if (cand.includes(targetClean) && targetClean.length >= 2) {
      return true;
    }

    // Target contains candidate (e.g. target "CARITA-025N" contains candidate "025N")
    if (targetClean.includes(cand) && cand.length >= 3) {
      return true;
    }
  }

  return false;
}
