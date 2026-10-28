import { VesselTracker, VesselTrackingResult, VesselScheduleItem } from "../types";
import { selectSingleBestSchedule } from "../helpers";
import { fetchWithRetry } from "@/lib/fetch-with-retry";
import { getTer3Session } from "../../ports/ter3";

export const ter3VesselTracker: VesselTracker = {
  async trackVessel(
    vesselName: string,
    line?: string
  ): Promise<VesselTrackingResult> {
    const cleanVessel = vesselName.trim().toUpperCase();

    try {
      const sessionResult = await getTer3Session();
      if (!sessionResult.success) {
        return {
          success: false,
          port: "ter3",
          vesselName: cleanVessel,
          schedules: [],
          selectedSchedule: null,
          error: sessionResult.error,
        };
      }

      const payload = JSON.stringify({
        search: cleanVessel,
        page: 1,
        row: 15,
        terminalCode: "T003",
      });

      const response = await fetchWithRetry("https://parama.pelindo.co.id:8031/api/getVesselVoyage", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Cookie: sessionResult.session.cookieStr,
          Authorization: sessionResult.session.sessionId,
          token: sessionResult.session.sessionId,
        },
        body: payload,
        cache: "no-store",
        retries: 0,
        retryDelayMs: 500,
        timeoutMs: 4000,
      });

      if (!response.ok && response.status !== 400) {
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
      if (json?.msg === "Data Not Found" || json?.code === 0) {
        return {
          success: true,
          port: "ter3",
          vesselName: cleanVessel,
          schedules: [],
          selectedSchedule: null,
        };
      }

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
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isTimeout =
        (error instanceof DOMException && (error.name === "TimeoutError" || error.name === "AbortError")) ||
        (error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError" || errorMessage.toLowerCase().includes("aborted") || errorMessage.toLowerCase().includes("timeout")));
      if (isTimeout) {
        // Silently treat timeout as vessel not found on TER3 (Pelindo port 8031 is frequently slow/unresponsive)
        return {
          success: true,
          port: "ter3",
          vesselName: cleanVessel,
          schedules: [],
          selectedSchedule: null,
        };
      }
      console.warn(`[TER3] Vessel schedule query error for ${cleanVessel}:`, errorMessage);
      return {
        success: false,
        port: "ter3",
        vesselName: cleanVessel,
        schedules: [],
        selectedSchedule: null,
        error: errorMessage || "Failed to fetch TER3 API",
      };
    }
  },
};
