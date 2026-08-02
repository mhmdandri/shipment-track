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

/**
 * Parses date string from TMAL into timestamp MS.
 * Handles YYYY-MM-DD HH:mm:ss, DD-MM-YYYY HH:mm:ss, DD/MM/YYYY HH:mm:ss, MM/DD/YYYY HH:mm:ss.
 */
export function parseTmalDateMs(dateStr: string | null | undefined): number {
  if (!dateStr || dateStr === "-" || dateStr.trim() === "") return 0;
  const clean = dateStr.trim();

  // 1. YYYY-MM-DD HH:mm:ss or YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(clean)) {
    const t = new Date(clean.replace(" ", "T")).getTime();
    if (!isNaN(t)) return t;
  }

  // 2. DD-MM-YYYY HH:mm:ss or DD-MM-YYYY
  const dmyDashMatch = clean.match(/^(\d{1,2})-(\d{1,2})-(\d{4})(?:\s+(\d{2}:\d{2}(?::\d{2})?))?/);
  if (dmyDashMatch) {
    const [, day, month, year, time] = dmyDashMatch;
    const iso = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T${time || "00:00:00"}`;
    const t = new Date(iso).getTime();
    if (!isNaN(t)) return t;
  }

  // 3. DD/MM/YYYY HH:mm:ss or MM/DD/YYYY HH:mm:ss
  const slashMatch = clean.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{2}:\d{2}(?::\d{2})?))?/);
  if (slashMatch) {
    const [, p1, p2, year, time] = slashMatch;
    const n2 = parseInt(p2, 10);
    if (n2 > 12) {
      // MM/DD/YYYY
      const iso = `${year}-${p1.padStart(2, "0")}-${p2.padStart(2, "0")}T${time || "00:00:00"}`;
      const t = new Date(iso).getTime();
      if (!isNaN(t)) return t;
    } else {
      // DD/MM/YYYY
      const iso = `${year}-${p2.padStart(2, "0")}-${p1.padStart(2, "0")}T${time || "00:00:00"}`;
      const t = new Date(iso).getTime();
      if (!isNaN(t)) return t;
    }
  }

  const fallbackMs = Date.parse(clean);
  return isNaN(fallbackMs) ? 0 : fallbackMs;
}

export interface TmalCandidate {
  foundStatus: string;
  foundTime: string;
  detailUrl: string;
  dateMs: number;
}

export async function parseTracking(
  html: string,
  containerNo: string
): Promise<{ foundStatus: string; foundTime: string; detailUrl: string } | null> {
  const $ = await getCheerio(html);
  const tableRows = $("table tbody tr");
  const candidates: TmalCandidate[] = [];

  tableRows.each((_, row) => {
    const cols = $(row).find("td");
    if (cols.length >= 6) {
      const colContainer = $(cols[2]).text().trim();
      if (colContainer.includes(containerNo)) {
        // Tanggal Tiba (Arrival)
        const timeVal = $(cols[4]).text().trim();
        // Tanggal Bongkar (Status)
        const statusVal = $(cols[5]).text().trim();
        const href = $(row).find("a").attr("href") || "";

        const timeMs = parseTmalDateMs(timeVal);
        const statusMs = parseTmalDateMs(statusVal);
        const dateMs = Math.max(timeMs, statusMs);

        candidates.push({
          foundTime: timeVal,
          foundStatus: statusVal,
          detailUrl: href,
          dateMs,
        });
      }
    }
  });

  if (candidates.length === 0) {
    return null;
  }

  // Sort candidates descending by dateMs so the newest transaction is selected first
  candidates.sort((a, b) => b.dateMs - a.dateMs);

  const best = candidates[0];
  if (!best.foundStatus && !best.foundTime) {
    return null;
  }

  return {
    foundStatus: best.foundStatus,
    foundTime: best.foundTime,
    detailUrl: best.detailUrl,
  };
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
    foundStatus.trim().toUpperCase() === "ON VESSEL" ? "ONVSL" : foundStatus.trim();
  let finalTime = foundTime.trim();
  let finalTimeOut: string | undefined = undefined;

  // TMAL does not provide a standard status string when discharged; it returns the discharge date.
  // We normalize non-ONVSL to GNSTK so it maps cleanly to yard allocation.
  if (finalStatus !== "ONVSL") {
    if (finalStatus) {
      finalTime = finalStatus;
    }
    finalStatus = "GNSTK";
  }

  // If outgate time is available in detail page, set status to OUTGT
  if (foundOutTime && foundOutTime.trim() !== "" && foundOutTime.trim() !== "-") {
    finalStatus = "OUTGT";
    finalTimeOut = foundOutTime.trim();
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
