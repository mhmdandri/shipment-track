import { PortTracker, TerminalTrackingResult, TrackInput } from "../types";
import { getCheerio } from "../utils";

export async function fetchHtml(
  containerNo: string
): Promise<{ ok: boolean; status: number; html?: string }> {
  const params = new URLSearchParams();
  params.set("search-bar", containerNo);
  params.set("submit", "");

  const response = await fetch("https://malt300.com/Layanan/statusImpor", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!response.ok) {
    return { ok: false, status: response.status };
  }

  const html = await response.text();
  return { ok: true, status: response.status, html };
}

export async function parseTracking(
  html: string,
  containerNo: string
): Promise<{ foundStatus: string; foundTime: string } | null> {
  const $ = await getCheerio(html);
  const tableRows = $("table tbody tr");

  let foundStatus = "";
  let foundTime = "";

  tableRows.each((_, row) => {
    const cols = $(row).find("td");
    if (cols.length >= 6) {
      const colContainer = $(cols[2]).text().trim();
      if (colContainer.includes(containerNo)) {
        // Tanggal Tiba (Arrival)
        foundTime = $(cols[4]).text().trim();
        // Tanggal Bongkar (Status)
        foundStatus = $(cols[5]).text().trim();
      }
    }
  });

  if (!foundStatus) {
    return null;
  }

  return { foundStatus, foundTime };
}

export function normalizeStatus(
  foundStatus: string,
  foundTime: string
): { status: string; time: string } {
  let finalStatus =
    foundStatus.toUpperCase() === "ON VESSEL" ? "ONVSL" : foundStatus;
  let finalTime = foundTime;

  // If it's not ONVSL, it's typically a date (Tanggal Bongkar) meaning it's discharged to yard.
  // We normalize it to GNSTK so our monitoring logic treats it uniformly.
  if (finalStatus !== "ONVSL") {
    finalTime = finalStatus; // the date it was discharged
    finalStatus = "GNSTK";
  }

  return { status: finalStatus, time: finalTime };
}

export async function trackTmal(
  input: TrackInput
): Promise<TerminalTrackingResult> {
  const { port, containerNo } = input;
  const res = await fetchHtml(containerNo);

  if (!res.ok || !res.html) {
    return {
      success: false,
      port,
      containerNo,
      error: `Error communicating with TMAL (Status ${res.status})`,
    };
  }

  const parsed = await parseTracking(res.html, containerNo);
  if (!parsed) {
    return {
      success: false,
      port,
      containerNo,
      error: "Container not found in TMAL system.",
    };
  }

  const normalized = normalizeStatus(parsed.foundStatus, parsed.foundTime);

  return {
    success: true,
    port,
    containerNo,
    status: normalized.status,
    time: normalized.time,
  };
}

export const tmalTracker: PortTracker = {
  track: trackTmal,
};
