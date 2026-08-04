import * as cheerio from "cheerio";
import { VesselTracker, VesselTrackingResult, VesselScheduleItem } from "../types";
import { selectSingleBestSchedule } from "../helpers";

export const kojaVesselTracker: VesselTracker = {
  async trackVessel(
    vesselName: string,
    line?: string
  ): Promise<VesselTrackingResult> {
    const cleanVessel = vesselName.trim().toUpperCase();

    try {
      const response = await fetch("https://www.tpkkoja.co.id/vessel-schedule/", {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
        signal: AbortSignal.timeout(10000),
        cache: "no-store",
      });

      if (!response.ok) {
        return {
          success: false,
          port: "koja",
          vesselName: cleanVessel,
          schedules: [],
          selectedSchedule: null,
          error: `Failed to fetch TPK KOJA schedule (HTTP ${response.status})`,
        };
      }

      const html = await response.text();
      const $ = cheerio.load(html);
      const schedules: VesselScheduleItem[] = [];

      $("table tr").each((_, tr) => {
        const tds = $(tr)
          .find("td")
          .map((_, td) => $(td).text().trim())
          .get();

        if (tds.length < 8) return;

        // Columns:
        // 0: NO, 1: VESSEL VOY (CARITA-025N), 2: VESSEL NAME (SINAR CARITA)
        // 3: ETA, 4: CT, 5: ETD, 6: NO_BC, 7: BERTHING DATETIME, 8: SERVICE CODE, 9: OPENSTACK
        const rawName = tds[2] || "";
        const voyRaw = tds[1] || "";
        const eta = tds[3] || null;
        const closingDoc = tds[4] || null;
        const etd = tds[5] || null;
        const etb = tds[7] || null;
        const service = tds[8] || "KOJA";
        const openStack = tds[9] && tds[9] !== ":59" ? tds[9] : null;

        if (!rawName || rawName.toUpperCase().includes("VESSEL NAME")) return;

        const currentName = rawName.toUpperCase();

        if (
          cleanVessel &&
          !currentName.includes(cleanVessel) &&
          !voyRaw.toUpperCase().includes(cleanVessel)
        ) {
          return;
        }

        schedules.push({
          vessel: currentName,
          line: line || "KOJA",
          voyIn: voyRaw,
          voyOut: voyRaw,
          service,
          status: etb ? "BERTHING / SCHEDULED" : "SCHEDULED",
          eta: eta || etb || null,
          etb: etb || eta || null,
          ata: null,
          etd: etd || null,
          atd: null,
          openStacking: openStack || null,
          closingDoc: closingDoc || null,
          closingPhysic: null,
          port: "koja",
        });
      });

      return {
        success: true,
        port: "koja",
        vesselName: cleanVessel,
        schedules,
        selectedSchedule: selectSingleBestSchedule(schedules),
      };
    } catch (error) {
      console.error("Error scraping TPK KOJA vessel schedule:", error);
      return {
        success: false,
        port: "koja",
        vesselName: cleanVessel,
        schedules: [],
        selectedSchedule: null,
        error: error instanceof Error ? error.message : "Failed to fetch KOJA schedule",
      };
    }
  },
};
