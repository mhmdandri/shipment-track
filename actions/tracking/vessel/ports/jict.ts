import { getCheerio } from "../../utils";
import { fetchWithRetry } from "@/lib/fetch-with-retry";
import {
  VesselTracker,
  VesselTrackingResult,
  VesselScheduleItem,
} from "../types";

/**
 * Normalizes JICT date format "DD/MM/YYYY HH:mm" into "YYYY-MM-DD HH:mm:ss".
 * Returns null if invalid or "-".
 */
export function parseJictDate(dateStr: string | null | undefined): string | null {
  if (!dateStr || dateStr === "-" || dateStr.trim() === "") return null;
  const clean = dateStr.trim();
  const match = clean.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}:\d{2}))?/);
  if (!match) return null;
  const [, day, month, year, time] = match;
  return `${year}-${month}-${day} ${time ? `${time}:00` : "00:00:00"}`;
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

      $(".working-vessel-table tbody tr").each((_, tr) => {
        const tds = $(tr).find("td");
        if (tds.length < 8) return;

        const getVal = (idx: number) => $(tds[idx]).text().trim();

        const vName = getVal(0);
        const voy = getVal(1);
        const arrivalRaw = getVal(2);
        const berthingRaw = getVal(3);
        const departureRaw = getVal(4);
        const closingRaw = getVal(5);
        const terminalCol = getVal(6);
        const statusRaw = getVal(7);
        const openStackRaw = tds.length >= 9 ? getVal(8) : "-";

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
