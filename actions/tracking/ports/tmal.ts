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
): Promise<{ foundStatus: string; foundTime: string; detailUrl: string } | null> {
  const $ = await getCheerio(html);
  const tableRows = $("table tbody tr");

  let foundStatus = "";
  let foundTime = "";
  let detailUrl = "";

  tableRows.each((_, row) => {
    const cols = $(row).find("td");
    if (cols.length >= 6) {
      const colContainer = $(cols[2]).text().trim();
      if (colContainer.includes(containerNo)) {
        // Tanggal Tiba (Arrival)
        foundTime = $(cols[4]).text().trim();
        // Tanggal Bongkar (Status)
        foundStatus = $(cols[5]).text().trim();
        const href = $(row).find("a").attr("href");
        if (href) {
          detailUrl = href;
        }
      }
    }
  });

  if (!foundStatus) {
    return null;
  }

  return { foundStatus, foundTime, detailUrl };
}

export async function fetchDetailHtml(
  urlPath: string
): Promise<{ ok: boolean; status: number; html?: string }> {
  const response = await fetch(`https://malt300.com${urlPath}`);
  if (!response.ok) {
    return { ok: false, status: response.status };
  }
  const html = await response.text();
  return { ok: true, status: response.status, html };
}

export async function parseDetail(html: string): Promise<string> {
  const $ = await getCheerio(html);
  const text = $("body").text();
  const match = text.match(/Tanggal Keluar\s+([\d-]+\s[\d:]+)/);
  return match ? match[1] : "";
}

export function normalizeStatus(
  foundStatus: string,
  foundTime: string,
  foundOutTime: string
): { status: string; time: string; timeOut?: string } {
  let finalStatus =
    foundStatus.toUpperCase() === "ON VESSEL" ? "ONVSL" : foundStatus;
  let finalTime = foundTime;
  let finalTimeOut = "";

  // If it's not ONVSL, it's typically a date (Tanggal Bongkar) meaning it's discharged to yard.
  // We normalize it to GNSTK so our monitoring logic treats it uniformly.
  if (finalStatus !== "ONVSL") {
    finalTime = finalStatus; // the date it was discharged
    finalStatus = "GNSTK";
  }

  // If there is an outgate time in the detail page, it overrides everything to OUTGT
  if (foundOutTime && foundOutTime !== "" && foundOutTime !== "-") {
    finalStatus = "OUTGT";
    finalTimeOut = foundOutTime;
  }

  return { status: finalStatus, time: finalTime, timeOut: finalTimeOut };
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

  let foundOutTime = "";
  if (parsed.detailUrl) {
    const detailRes = await fetchDetailHtml(parsed.detailUrl);
    if (detailRes.ok && detailRes.html) {
      foundOutTime = await parseDetail(detailRes.html);
    }
  }

  const normalized = normalizeStatus(
    parsed.foundStatus,
    parsed.foundTime,
    foundOutTime
  );

  return {
    success: true,
    port,
    containerNo,
    status: normalized.status,
    time: normalized.time,
    timeOut: normalized.timeOut,
  };
}

export const tmalTracker: PortTracker = {
  track: trackTmal,
};
