import { VesselTracker, VesselTrackingResult, VesselScheduleItem } from "../types";
import { selectSingleBestSchedule } from "../index";

export const ter3VesselTracker: VesselTracker = {
  async trackVessel(
    vesselName: string,
    line?: string
  ): Promise<VesselTrackingResult> {
    const cleanVessel = vesselName.trim().toUpperCase();

    try {
      const payload = JSON.stringify({
        search: cleanVessel,
        page: 1,
        row: 50,
        terminalCode: "T003",
      });

      const response = await fetch("https://parama.pelindo.co.id:8031/api/getVesselVoyage", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
        body: payload,
        signal: AbortSignal.timeout(10000),
        cache: "no-store",
      });

      if (!response.ok) {
        return {
          success: false,
          port: "ter3",
          vesselName: cleanVessel,
          schedules: [],
          selectedSchedule: null,
          error: `Failed to fetch TER3 Pelindo API (HTTP ${response.status})`,
        };
      }

      const json = await response.json();
      const records = json?.dataRec || json?.data || [];

      if (!Array.isArray(records)) {
        return {
          success: true,
          port: "ter3",
          vesselName: cleanVessel,
          schedules: [],
          selectedSchedule: null,
        };
      }

      const schedules: VesselScheduleItem[] = records.map((item: Record<string, unknown>) => {
        const vName = String(item.vessel || "").toUpperCase();
        const voyIn = String(item.voyageIn || item.voyage || "");
        const voyOut = String(item.voyageOut || "");
        const operatorLine = String(item.operatorName || item.operator || line || "TER3");
        const eta = String(item.eta || "");
        const etb = String(item.etb || "");
        const etd = String(item.etd || "");
        const openStack = String(item.openStack || "");
        const closingDoc = String(item.clossingTime || item.cutOffDoc || "");

        return {
          vessel: vName,
          line: operatorLine,
          voyIn,
          voyOut,
          service: "TER3",
          status: etb ? "BERTHING / SCHEDULED" : "SCHEDULED",
          eta: eta || etb || null,
          etb: etb || eta || null,
          ata: null,
          etd: etd || null,
          atd: null,
          openStacking: openStack || null,
          closingDoc: closingDoc || null,
          closingPhysic: null,
          port: "ter3",
        };
      });

      return {
        success: true,
        port: "ter3",
        vesselName: cleanVessel,
        schedules,
        selectedSchedule: selectSingleBestSchedule(schedules),
      };
    } catch (error) {
      console.error("Error fetching TER3 Pelindo vessel API:", error);
      return {
        success: false,
        port: "ter3",
        vesselName: cleanVessel,
        schedules: [],
        selectedSchedule: null,
        error: error instanceof Error ? error.message : "Failed to fetch TER3 API",
      };
    }
  },
};
