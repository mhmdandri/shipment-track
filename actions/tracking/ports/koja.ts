import { PortTracker, TerminalTrackingResult, TrackInput } from "../types";
import { getCheerio, isObType } from "../utils";
import { checkJictOb } from "./jict";

export async function fetchHtml(
  containerNo: string,
): Promise<{ ok: boolean; status: number; html?: string }> {
  const params = new URLSearchParams();
  params.set("CNTR_ID", containerNo);
  params.set("submit", "Show Detail");

  const response = await fetch(
    "https://www.tpkkoja.co.id/online-consignee-container-tracking/",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    },
  );

  if (!response.ok) {
    return { ok: false, status: response.status };
  }

  const html = await response.text();
  return { ok: true, status: response.status, html };
}

export async function parseLocation(html: string): Promise<{
  tableFound: boolean;
  foundStatus: string;
  foundTime: string;
  foundOutTime: string;
  foundCustomer: string;
  foundRemarks: string;
}> {
  const $ = await getCheerio(html);
  const table = $("table#datatables");

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

  return {
    tableFound: true,
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
    raw: parsed.foundRemarks ? { remarks: parsed.foundRemarks } : undefined,
  };
}

export const kojaTracker: PortTracker = {
  track: trackKoja,
};
