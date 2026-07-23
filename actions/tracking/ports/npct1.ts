import { PortTracker, TerminalTrackingResult, TrackInput } from "../types";
import { getCheerio } from "../utils";

export async function getCsrfToken(): Promise<{
  cookieStr: string;
  csrfToken: string;
}> {
  const initRes = await fetch("https://www.npct1.co.id/");

  const setCookies = initRes.headers.getSetCookie
    ? initRes.headers.getSetCookie()
    : [];
  const cookieStr = setCookies.map((c) => c.split(";")[0]).join("; ");

  const initHtml = await initRes.text();
  const tokenMatch = initHtml.match(/name="csrf-token"\s+content="([^"]+)"/);
  const csrfToken = tokenMatch ? tokenMatch[1] : "";

  return { cookieStr, csrfToken };
}

export async function submitTracking(
  vesselName: string,
  voyageNo: string,
  containerNo: string,
  cookieStr: string,
  csrfToken: string,
): Promise<{ ok: boolean; status: number; redirectUrl?: string }> {
  // NPCT1 requires exactly the last 4 characters of the voyage
  const finalVoyage = voyageNo.length > 4 ? voyageNo.slice(-4) : voyageNo;

  const params = new URLSearchParams();
  params.set("vesselTracking", vesselName);
  params.set("vesselVoyage", finalVoyage);
  params.set("vesselDirection", "OUT");
  params.set("vesselContainer", containerNo);
  params.set("_token", csrfToken);

  const postRes = await fetch("https://www.npct1.co.id/req/container", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: cookieStr,
      "X-CSRF-TOKEN": csrfToken,
      "X-Requested-With": "XMLHttpRequest",
    },
    body: params.toString(),
  });

  if (!postRes.ok) {
    return { ok: false, status: postRes.status };
  }

  const postJson = await postRes.json();
  if (!postJson.redirect || !postJson.redirect.url) {
    return { ok: true, status: postRes.status }; // no redirect url
  }

  return {
    ok: true,
    status: postRes.status,
    redirectUrl: postJson.redirect.url,
  };
}

export async function fetchTrackingPage(
  url: string,
  cookieStr: string,
): Promise<{ ok: boolean; status: number; html?: string }> {
  const getHtmlRes = await fetch(url, {
    method: "GET",
    headers: {
      Cookie: cookieStr,
    },
  });

  if (!getHtmlRes.ok) {
    return { ok: false, status: getHtmlRes.status };
  }

  const html = await getHtmlRes.text();
  return { ok: true, status: getHtmlRes.status, html };
}

export async function parseTracking(html: string): Promise<{
  foundStatus: string;
  foundTime: string;
  foundOutTime: string;
  foundOb: string;
  foundObName: string;
  foundCustomer: string;
}> {
  const $ = await getCheerio(html);

  // Parse status from: <span class="status-desc">...<span class="semi-bold">GATEOUT TERMINAL</span></span>
  const foundStatus = $(".status-desc .semi-bold").text().trim();

  // Parse Container In and Out times
  let foundTime = "";
  let foundOutTime = "";
  let foundOb = "";
  let foundObName = "";
  let foundCustomer = "";
  $("p.hint-text").each((_, el) => {
    const text = $(el).text().trim().toUpperCase();
    if (text === "CONTAINER IN" || text.includes("STACK")) {
      foundTime = $(el).next("h5").text().trim();
    } else if (text === "CONTAINER OUT" || text.includes("GATE OUT")) {
      foundOutTime = $(el).next("h5").text().trim();
    } else if (text === "CUSTOMS DOC") {
      foundOb = $(el).next("h5").text().trim();
    } else if (text === "REMARK") {
      foundObName = $(el).next("h5").text().trim();
    } else if (text === "SHIPPER / CONSIGNEE") {
      foundCustomer = $(el).next("h5").text().trim();
    }
  });

  return {
    foundStatus,
    foundTime,
    foundOutTime,
    foundOb,
    foundObName,
    foundCustomer,
  };
}

export function normalizeStatus(
  foundStatus: string,
  foundTime: string,
  foundOutTime: string,
): { status: string; time: string } {
  let finalStatus = foundStatus.toUpperCase();
  let finalTime = foundTime;

  if (finalStatus === "STACKING YARD") {
    finalStatus = "GNSTK";
  } else if (
    (finalStatus.includes("GATEOUT") ||
      finalStatus.includes("GATE OUT") ||
      finalStatus.includes("DELIVERED")) &&
    !finalStatus.includes("PLANNING")
  ) {
    finalStatus = "OUTGT";
    if (foundOutTime) {
      finalTime = foundOutTime;
    }
  }

  return { status: finalStatus, time: finalTime };
}

export async function trackNpct1(
  input: TrackInput,
): Promise<TerminalTrackingResult> {
  const { port, containerNo, vesselName, voyageNo } = input;

  if (!vesselName || !voyageNo) {
    return {
      success: false,
      port,
      containerNo,
      error: "NPCT1 requires Vessel Code (e.g. EVBIT) and Voyage No.",
    };
  }

  const { cookieStr, csrfToken } = await getCsrfToken();
  const submitRes = await submitTracking(
    vesselName,
    voyageNo,
    containerNo,
    cookieStr,
    csrfToken,
  );

  if (!submitRes.ok) {
    return {
      success: false,
      port,
      containerNo,
      error: `Error communicating with NPCT1 POST (Status ${submitRes.status})`,
    };
  }

  if (!submitRes.redirectUrl) {
    return {
      success: false,
      port,
      containerNo,
      error: "Container not found or invalid Vessel/Voyage in NPCT1.",
    };
  }

  const pageRes = await fetchTrackingPage(submitRes.redirectUrl, cookieStr);
  if (!pageRes.ok || !pageRes.html) {
    return {
      success: false,
      port,
      containerNo,
      error: `Error communicating with NPCT1 GET (Status ${pageRes.status})`,
    };
  }

  const parsed = await parseTracking(pageRes.html);
  if (!parsed.foundStatus) {
    return {
      success: false,
      port,
      containerNo,
      error: "Container not found or invalid Vessel/Voyage in NPCT1.",
    };
  }

  const normalized = normalizeStatus(
    parsed.foundStatus,
    parsed.foundTime,
    parsed.foundOutTime,
  );

  return {
    success: true,
    port,
    containerNo,
    status: normalized.status,
    time: normalized.time,
    ob: parsed.foundOb,
    obName: parsed.foundObName,
    customer: parsed.foundCustomer,
  };
}

export const npct1Tracker: PortTracker = {
  track: trackNpct1,
};
