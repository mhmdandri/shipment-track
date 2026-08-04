import { getCheerio } from "../../utils";
import { getCsrfToken } from "../../ports/npct1";
import {
  VesselTracker,
  VesselTrackingResult,
  VesselScheduleItem,
} from "../types";
import { selectSingleBestSchedule } from "../helpers";

export function selectNewestVesselSchedule(
  schedules: VesselScheduleItem[]
): VesselScheduleItem | null {
  return selectSingleBestSchedule(schedules);
}

export const npct1VesselTracker: VesselTracker = {
  async trackVessel(
    vesselName: string,
    line?: string
  ): Promise<VesselTrackingResult> {
    const port = "npct1";
    const cleanVessel = vesselName.trim();

    if (!cleanVessel) {
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
      const { cookieStr, csrfToken } = await getCsrfToken();

      const params = new URLSearchParams();
      params.set("scheduleVessel", cleanVessel);
      params.set("scheduleLine", line ? line.trim() : "");
      params.set("_token", csrfToken);

      const postRes = await fetch("https://www.npct1.co.id/req/vessel", {
        method: "POST",
        signal: AbortSignal.timeout(10000),
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Cookie: cookieStr,
          "X-CSRF-TOKEN": csrfToken,
          "X-Requested-With": "XMLHttpRequest",
        },
        body: params.toString(),
      });

      if (!postRes.ok) {
        return {
          success: false,
          port,
          vesselName: cleanVessel,
          schedules: [],
          selectedSchedule: null,
          error: `Gagal menghubungi server NPCT1 (HTTP ${postRes.status}).`,
        };
      }

      let redirectUrl = "";
      try {
        const postJson = await postRes.json();
        if (postJson.redirect && postJson.redirect.url) {
          redirectUrl = postJson.redirect.url;
        }
      } catch {
        // Fallback
      }

      if (!redirectUrl) {
        return {
          success: false,
          port,
          vesselName: cleanVessel,
          schedules: [],
          selectedSchedule: null,
          error: "Hasil pencarian kapal tidak ditemukan di NPCT1.",
        };
      }

      const htmlRes = await fetch(redirectUrl, {
        method: "GET",
        signal: AbortSignal.timeout(10000),
        headers: {
          Cookie: cookieStr,
        },
      });

      if (!htmlRes.ok) {
        return {
          success: false,
          port,
          vesselName: cleanVessel,
          schedules: [],
          selectedSchedule: null,
          error: `Gagal mengunduh halaman jadwal NPCT1 (HTTP ${htmlRes.status}).`,
        };
      }

      const html = await htmlRes.text();
      const $ = await getCheerio(html);

      const schedules: VesselScheduleItem[] = [];

      $("#idTableVesselSchedule tbody tr").each((_, tr) => {
        const tds = $(tr).find("td");
        if (tds.length < 11) return;

        const getVal = (idx: number) => $(tds[idx]).text().trim();

        schedules.push({
          vessel: getVal(0),
          line: getVal(1),
          voyIn: getVal(2),
          voyOut: getVal(3),
          service: getVal(4),
          status: getVal(5),
          eta: getVal(6) || null,
          etb: getVal(6) || null,
          ata: getVal(7) || null,
          etd: getVal(8) || null,
          atd: getVal(9) || null,
          openStacking: getVal(10) || null,
          closingDoc: getVal(11) || null,
          closingPhysic: getVal(12) || null,
          port: "npct1",
        });
      });

      if (schedules.length === 0) {
        return {
          success: false,
          port,
          vesselName: cleanVessel,
          schedules: [],
          selectedSchedule: null,
          error: `Kapal "${cleanVessel}" tidak ditemukan pada jadwal NPCT1.`,
        };
      }

      const selectedSchedule = selectNewestVesselSchedule(schedules);

      return {
        success: true,
        port,
        vesselName: cleanVessel,
        schedules,
        selectedSchedule,
      };
    } catch (error) {
      console.error("NPCT1 Vessel Tracking Scraper Error:", error);
      return {
        success: false,
        port,
        vesselName: cleanVessel,
        schedules: [],
        selectedSchedule: null,
        error:
          error instanceof Error
            ? error.message
            : "Terjadi kesalahan saat memproses jadwal kapal NPCT1.",
      };
    }
  },
};
