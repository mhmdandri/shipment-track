import { PortTracker, TerminalTrackingResult, TrackInput } from "../types";
import { getCheerio, isObType } from "../utils";
import { checkJictOb } from "./jict";

export async function fetchHtml(
  containerNo: string,
): Promise<{ ok: boolean; status: number; html?: string }> {
  const cleanContainer = containerNo.trim().toUpperCase();
  const params = new URLSearchParams();
  params.set("CNTR_ID", cleanContainer);
  params.set("submit", "Search");

  try {
    const response = await fetch("https://www.tpkkoja.co.id/container-tracking/", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      body: params.toString(),
      signal: AbortSignal.timeout(12000),
    });

    if (response.ok) {
      const html = await response.text();
      return { ok: true, status: response.status, html };
    }
  } catch (err) {
    console.warn("Primary KOJA tracking endpoint error, checking fallback:", err);
  }

  // Fallback to legacy endpoint if primary is down
  try {
    const legacyParams = new URLSearchParams();
    legacyParams.set("CNTR_ID", cleanContainer);
    legacyParams.set("submit", "Show Detail");

    const fallbackRes = await fetch(
      "https://www.tpkkoja.co.id/online-consignee-container-tracking/",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
        body: legacyParams.toString(),
        signal: AbortSignal.timeout(10000),
      },
    );

    if (!fallbackRes.ok) {
      return { ok: false, status: fallbackRes.status };
    }

    const html = await fallbackRes.text();
    return { ok: true, status: fallbackRes.status, html };
  } catch {
    return { ok: false, status: 500 };
  }
}

export async function parseLocation(html: string): Promise<{
  tableFound: boolean;
  foundStatus: string;
  foundTime: string;
  foundOutTime: string;
  foundCustomer: string;
  foundRemarks: string;
  foundVessel?: string;
  foundCategory?: string;
  foundSize?: string;
}> {
  const $ = await getCheerio(html);

  // 1. New KOJA Container Tracking Layout (.cntr-wrap)
  if ($(".cntr-wrap").length > 0) {
    const fields: Record<string, string> = {};
    $(".cntr-field").each((_, el) => {
      const label = $(el).find(".label").text().trim();
      const value = $(el).find(".value").text().trim();
      if (label) {
        fields[label] = value;
      }
    });

    const foundStatus = fields["Location"] || fields["Terminal Status"] || "";
    const foundTime = fields["In Time / Stack CY"] || fields["In Time"] || "";
    const foundOutTime =
      fields["Out Time"] ||
      fields["Out Time / Gate Out"] ||
      fields["Gate Out"] ||
      "";
    const foundCustomer = fields["Consignee"] || fields["Shipper"] || "";
    const foundRemarks = fields["Remarks"] || "";
    const foundCategory = fields["Category"] || "";
    const foundSize = fields["Size/Type/Height"] || fields["ISO Code"] || "";

    let foundVessel = "";
    $(".cntr-carriers > div").each((_, div) => {
      const title = $(div).find(".cntr-carrier-title").text().trim();
      if (title.toLowerCase().includes("vessel")) {
        $(div)
          .find(".cntr-field")
          .each((_, el) => {
            const label = $(el).find(".label").text().trim();
            const value = $(el).find(".value").text().trim();
            if (label.toLowerCase() === "name") {
              foundVessel = value;
            }
          });
      }
    });

    return {
      tableFound: true,
      foundStatus,
      foundTime,
      foundOutTime,
      foundCustomer,
      foundRemarks,
      foundVessel,
      foundCategory,
      foundSize,
    };
  }

  // 2. Legacy Table Format Fallback (table#datatables)
  const table = $("table#datatables, table");
  if (table.length === 0) {
    return {
      tableFound: false,
      foundStatus: "",
      foundTime: "",
      foundOutTime: "",
      foundCustomer: "",
      foundRemarks: "",
    };
  }

  let foundStatus = "";
  let foundTime = "";
  let foundOutTime = "";
  let foundCustomer = "";
  let foundRemarks = "";

  table.find("tr").each((_, row) => {
    $(row)
      .find("td")
      .each((_, td) => {
        const text = $(td).text().trim();
        if (text === "Location") {
          foundStatus = $(td).next("td").text().trim();
        }
        if (text === "In Time / Stack CY") {
          foundTime = $(td).next("td").text().trim();
        }
        if (
          text === "Out Time / Gate Out" ||
          text.includes("Out Time") ||
          text.includes("Gate Out")
        ) {
          foundOutTime = $(td).next("td").text().trim();
        }
        if (text === "Consignee") {
          foundCustomer = $(td).next("td").text().trim();
        }
        if (text === "Remarks" || text.includes("Remark")) {
          foundRemarks = $(td).next("td").text().trim();
        }
      });
  });

  const tableFound = Boolean(foundStatus || foundTime || foundOutTime || foundCustomer);

  return {
    tableFound,
    foundStatus,
    foundTime,
    foundOutTime,
    foundCustomer,
    foundRemarks,
  };
}

export function normalizeStatus(
  foundStatus: string,
  foundTime: string,
  foundOutTime: string,
): { status: string; time: string; timeOut?: string } {
  const finalStatus = foundStatus.trim();
  let finalTime = foundTime.trim();
  const timeOut =
    foundOutTime && foundOutTime.trim() !== "-" ? foundOutTime.trim() : undefined;

  if (timeOut && !finalTime) {
    finalTime = timeOut;
  }

  return { status: finalStatus, time: finalTime, timeOut };
}

export async function trackKoja(
  input: TrackInput,
): Promise<TerminalTrackingResult> {
  const { port, containerNo } = input;
  const res = await fetchHtml(containerNo);

  if (!res.ok || !res.html) {
    return {
      success: false,
      port,
      containerNo,
      error: `Error communicating with KOJA (Status ${res.status})`,
    };
  }

  const parsed = await parseLocation(res.html);
  if (!parsed.tableFound) {
    return {
      success: false,
      port,
      containerNo,
      error: "Container not found in KOJA system.",
    };
  }

  if (!parsed.foundStatus) {
    return {
      success: false,
      port,
      containerNo,
      error: "Failed to parse Location from KOJA response.",
    };
  }

  const normalized = normalizeStatus(
    parsed.foundStatus,
    parsed.foundTime,
    parsed.foundOutTime,
  );

  // Check BC On Demand system (bcondemand.jict.co.id) to confirm if container officially moved to OB/PLP
  let ob: string | undefined;
  let obName: string | undefined;

  try {
    const obData = await checkJictOb(containerNo);
    if (obData && isObType(obData.ob)) {
      ob = obData.ob;
      obName = obData.obName;
    }
  } catch (err) {
    console.error("Error checking BC On Demand for KOJA:", err);
  }

  const rawData: Record<string, unknown> = {};
  if (parsed.foundRemarks) rawData.remarks = parsed.foundRemarks;
  if (parsed.foundVessel) rawData.vessel = parsed.foundVessel;
  if (parsed.foundCategory) rawData.category = parsed.foundCategory;
  if (parsed.foundSize) rawData.size = parsed.foundSize;

  return {
    success: true,
    port,
    containerNo,
    status: normalized.status,
    time: normalized.time,
    timeOut: normalized.timeOut,
    customer: parsed.foundCustomer,
    ob,
    obName,
    raw: Object.keys(rawData).length > 0 ? rawData : undefined,
  };
}

export const kojaTracker: PortTracker = {
  track: trackKoja,
};
