import * as cheerio from "cheerio";
import { VesselTracker, VesselTrackingResult, VesselScheduleItem } from "../types";
import { selectSingleBestSchedule } from "../helpers";

export const tmalVesselTracker: VesselTracker = {
  async trackVessel(
    vesselName: string,
    line?: string
  ): Promise<VesselTrackingResult> {
    const cleanVessel = vesselName.trim().toUpperCase();

    try {
      const response = await fetch("https://malt300.com/Layanan/jadwalKapal", {
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
          port: "tmal",
          vesselName: cleanVessel,
          schedules: [],
          selectedSchedule: null,
          error: `Failed to fetch TMAL schedule (HTTP ${response.status})`,
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
        // 0: No., 1: Nama Kapal, 2: Perusahaan Pelayaran, 3: Voy Masuk, 4: Voy Keluar,
        // 5: Open Stack, 6: Tanggal Sandar (ETB), 7: Tanggal Berangkat (ETD), 8: Tanggal Penutupan (Closing)
        const rawName = (tds[1] || "").replace(/^MV\.\s*/i, "");
        const shippingLine = tds[2] || line || "TMAL";
        const voyIn = tds[3] || "";
        const voyOut = tds[4] || "";
        const openStack = tds[5] || null;
        const etb = tds[6] || null;
        const etd = tds[7] || null;
        const closingDoc = tds[8] || null;

        if (!rawName || rawName.toUpperCase().includes("NAMA KAPAL")) return;

        const currentName = rawName.toUpperCase();

        if (
          cleanVessel &&
          !currentName.includes(cleanVessel) &&
          !`${voyIn} ${voyOut}`.toUpperCase().includes(cleanVessel)
        ) {
          return;
        }

        schedules.push({
          vessel: currentName,
          line: shippingLine,
          voyIn,
          voyOut,
          service: "TMAL",
          status: etb ? "BERTHING / SCHEDULED" : "SCHEDULED",
          eta: etb || null,
          etb: etb || null,
          ata: null,
          etd: etd || null,
          atd: null,
          openStacking: openStack || null,
          closingDoc: closingDoc || null,
          closingPhysic: null,
          port: "tmal",
        });
      });

      return {
        success: true,
        port: "tmal",
        vesselName: cleanVessel,
        schedules,
        selectedSchedule: selectSingleBestSchedule(schedules),
      };
    } catch (error) {
      console.error("Error scraping TMAL vessel schedule:", error);
      return {
        success: false,
        port: "tmal",
        vesselName: cleanVessel,
        schedules: [],
        selectedSchedule: null,
        error: error instanceof Error ? error.message : "Failed to fetch TMAL schedule",
      };
    }
  },
};
