import { getCheerio } from "../../utils";
import { fetchWithRetry } from "@/lib/fetch-with-retry";
import {
  VesselTracker,
  VesselTrackingResult,
  VesselScheduleItem,
} from "../types";

/**
 * Normalizes JICT date format "DD/MM/YYYY HH:mm" or "DD-MM-YYYY HH:mm" into "DD/MM/YYYY HH:mm".
 * Accurately extracts hours and minutes even with non-breaking spaces, HTML tags, or dot separators.
 * Returns null if invalid or "-".
 */
export function parseJictDate(dateStr: string | null | undefined): string | null {
  if (!dateStr || dateStr === "-" || dateStr.trim() === "") return null;
  const clean = dateStr
    .replace(/<[^>]*>/g, " ")
    .replace(/[\u00a0\s]+/g, " ")
    .trim();

  const match = clean.match(
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:[,\s]+(\d{1,2})[:.](\d{2})(?:[:.]\d{2})?)?/
  );
  if (!match) return null;

  const [, day, month, year, rawHour, rawMinute] = match;
  const d = day.padStart(2, "0");
  const m = month.padStart(2, "0");

  if (rawHour !== undefined && rawMinute !== undefined) {
    const hh = rawHour.padStart(2, "0");
    const mm = rawMinute.padStart(2, "0");
    return `${d}/${m}/${year} ${hh}:${mm}`;
  }

  return `${d}/${m}/${year}`;
}

import { selectSingleBestSchedule } from "../helpers";

/**
 * Picks the best / earliest upcoming schedule item relative to check date.
 */
export function selectNewestJictSchedule(
  schedules: VesselScheduleItem[]
): VesselScheduleItem | null {
  return selectSingleBestSchedule(schedules);
}

export const jictVesselTracker: VesselTracker = {
  async trackVessel(
    vesselName: string,
    line?: string
  ): Promise<VesselTrackingResult> {
    const port = "jict";
    const cleanSearch = vesselName.trim().toUpperCase();

    if (!cleanSearch) {
      return {
        success: false,
        port,
        vesselName,
        schedules: [],
        selectedSchedule: null,
        error: "Nama kapal (vessel name) wajib diisi.",
      };
    }

    try {
      const res = await fetchWithRetry("https://www.jict.co.id/vessel-schedule", {
        retries: 2,
        retryDelayMs: 1500,
        timeoutMs: 12000,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      });

      if (!res.ok) {
        return {
          success: false,
          port,
          vesselName: cleanSearch,
          schedules: [],
          selectedSchedule: null,
          error: `Gagal menghubungi server JICT (HTTP ${res.status}).`,
        };
      }

      const html = await res.text();
      const $ = await getCheerio(html);

      const allSchedules: VesselScheduleItem[] = [];

      const colMap = {
        vessel: 0,
        voyage: 1,
        arrival: 2,
        berthing: 3,
        departure: 4,
        closing: 5,
        terminal: 6,
        status: 7,
        openStack: 8,
      };

      $(".working-vessel-table thead th").each((idx, th) => {
        const text = $(th).text().trim().toLowerCase();
        if (text.includes("vessel")) colMap.vessel = idx;
        else if (text.includes("voyage")) colMap.voyage = idx;
        else if (text.includes("arrival")) colMap.arrival = idx;
        else if (text.includes("berth")) colMap.berthing = idx;
        else if (text.includes("depart")) colMap.departure = idx;
        else if (text.includes("closing")) colMap.closing = idx;
        else if (text.includes("terminal")) colMap.terminal = idx;
        else if (text.includes("status")) colMap.status = idx;
        else if (text.includes("open") || text.includes("stack")) colMap.openStack = idx;
      });

      $(".working-vessel-table tbody tr").each((_, tr) => {
        const tds = $(tr).find("td");
        if (tds.length < 8) return;

        const getVal = (idx: number) => $(tds[idx]).text().trim();

        const vName = getVal(colMap.vessel);
        const voy = getVal(colMap.voyage);
        const arrivalRaw = getVal(colMap.arrival);
        const berthingRaw = getVal(colMap.berthing);
        const departureRaw = getVal(colMap.departure);
        const closingRaw = getVal(colMap.closing);
        const terminalCol = getVal(colMap.terminal);
        const statusRaw = getVal(colMap.status);
        const openStackRaw = tds.length > colMap.openStack ? getVal(colMap.openStack) : "-";

        allSchedules.push({
          vessel: vName,
          line: line || terminalCol || "JICT",
          voyIn: voy,
          voyOut: voy,
          service: terminalCol || "-",
          status: statusRaw || "PLAN",
          eta: parseJictDate(arrivalRaw) || parseJictDate(berthingRaw),
          etb: parseJictDate(berthingRaw) || parseJictDate(arrivalRaw),
          ata: statusRaw.toUpperCase() === "BERTH" || statusRaw.toUpperCase() === "WORKING" ? parseJictDate(berthingRaw) : null,
          etd: parseJictDate(departureRaw),
          atd: statusRaw.toUpperCase() === "FINISH" || statusRaw.toUpperCase() === "COMPLETE" ? parseJictDate(departureRaw) : null,
          openStacking: parseJictDate(openStackRaw),
          closingDoc: parseJictDate(closingRaw),
          closingPhysic: parseJictDate(closingRaw),
          port: "jict",
        });
      });

      // Filter rows matching search query (matching vessel name or voyage)
      const matchedSchedules = allSchedules.filter((item) => {
        const itemVesselUpper = item.vessel.toUpperCase();
        const itemVoyUpper = item.voyIn.toUpperCase();
        const combined = `${itemVesselUpper} ${itemVoyUpper}`;

        return (
          itemVesselUpper.includes(cleanSearch) ||
          cleanSearch.includes(itemVesselUpper) ||
          combined.includes(cleanSearch) ||
          cleanSearch.includes(combined)
        );
      });

      if (matchedSchedules.length === 0) {
        return {
          success: false,
          port,
          vesselName: cleanSearch,
          schedules: [],
          selectedSchedule: null,
          error: `Kapal "${cleanSearch}" tidak ditemukan pada jadwal kapal JICT.`,
        };
      }

      const selectedSchedule = selectNewestJictSchedule(matchedSchedules);

      return {
        success: true,
        port,
        vesselName: cleanSearch,
        schedules: matchedSchedules,
        selectedSchedule,
      };
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.warn(`[JICT Scraper] Network/Parse issue for "${cleanSearch}": ${errMsg}`);
      return {
        success: false,
        port,
        vesselName: cleanSearch,
        schedules: [],
        selectedSchedule: null,
        error: "Gagal terhubung ke server JICT (Koneksi RTO / Reset). Silakan coba lagi.",
      };
    }
  },
};
