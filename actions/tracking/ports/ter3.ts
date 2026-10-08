import prisma from "@/lib/prisma";
import { PortTracker, TerminalTrackingResult, TrackInput } from "../types";
import { isOutgateStatus } from "../utils";

export interface Ter3Session {
  sessionId: string;
  cookieStr: string;
  customerCode: string;
  defaultRoleCode: string;
  organizationCode: string;
}

export interface Ter3HandlingItem {
  tmlCd?: string;
  containerNo?: string;
  vessel?: string;
  voyage?: string;
  voyageIn?: string;
  voyageOut?: string;
  activity?: string;
  location?: string | null;
  activityTime?: string;
  alat?: string;
  userName?: string;
  block?: string;
  slot?: string;
  row?: string;
  tier?: string;
  operator?: string;
}

export interface Ter3DataRec {
  noContainer?: string;
  containerNo?: string;
  containerDetail?: string;
  isoCode?: string;
  weight?: number;
  statusCode?: string;
  typeCont?: string;
  vgm?: number;
  activity?: string;
  updateTime?: string;
  dateStatus?: string;
  customerName?: string;
  customerCode?: string;
  vessel?: string;
  vesselvoyage?: string;
  voyage?: string;
  voyageIn?: string;
  voyageOut?: string;
  eta?: string;
  etb?: string;
  etd?: string;
  ata?: string;
  atb?: string;
  atd?: string;
  pol?: string;
  pod?: string;
  ydBlock?: string;
  ydSlot?: string;
  ydTier?: string;
  ydRow?: string;
  locationJpt?: string;
  locationSpl?: string;
  truckNumber?: string;
  blNumber?: string;
  doDate?: string;
  noSppb?: string;
  tglSppb?: string;
  handling?: Ter3HandlingItem[];
  [key: string]: unknown;
}

export interface Ter3TrackResponse {
  code?: string;
  msg?: string;
  dataRec?: Ter3DataRec | unknown[];
  detail?: {
    statusCode?: number;
  };
}

let ter3SessionCache: Ter3Session | null = null;

export function loadCachedSession(): Ter3Session | null {
  return ter3SessionCache;
}

export async function loadSessionFromDB(): Promise<Ter3Session | null> {
  try {
    const dbSession = await prisma.systemConfig.findUnique({
      where: { key: "TER3_SESSION" },
    });
    if (dbSession) {
      const parsed = JSON.parse(dbSession.value) as Ter3Session;
      ter3SessionCache = parsed;
      console.log("[TER3] Loaded session from Database.");
      return parsed;
    }
  } catch (e) {
    console.error("Failed to load TER3 session from DB:", e);
  }
  return null;
}

export async function saveSession(session: Ter3Session): Promise<void> {
  ter3SessionCache = session;
  try {
    await prisma.systemConfig.upsert({
      where: { key: "TER3_SESSION" },
      update: { value: JSON.stringify(session) },
      create: { key: "TER3_SESSION", value: JSON.stringify(session) },
    });
    console.log("[TER3] Saved new session to Database.");
  } catch (e) {
    console.error("Failed to save TER3 session to DB:", e);
  }
}

export async function login(): Promise<
  { success: true; session: Ter3Session } | { success: false; error: string }
> {
  ter3SessionCache = null;
  const username = process.env.PARAMA_USERNAME;
  const password = process.env.PARAMA_PASSWORD;

  if (!username || !password) {
    return {
      success: false,
      error:
        "TER3 Login credentials (PARAMA_USERNAME/PARAMA_PASSWORD) are not configured in environment.",
    };
  }

  const loginUrl = "https://parama.pelindo.co.id:8031/api/login";

  try {
    const loginRes = await fetch(loginUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      cache: "no-store",
      body: JSON.stringify({
        username,
        password,
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!loginRes.ok) {
      return {
        success: false,
        error: `TER3 Login failed (Status ${loginRes.status})`,
      };
    }

    const loginData = await loginRes.json();
    if (!loginData.sessionId || loginData.code !== "1") {
      return {
        success: false,
        error: "TER3 Login failed: Invalid credentials or session.",
      };
    }

    const rawSetCookies = loginRes.headers.getSetCookie
      ? loginRes.headers.getSetCookie()
      : [];
    const cookieStr = rawSetCookies
      .map((c: string) => c.split(";")[0])
      .join("; ");

    const session: Ter3Session = {
      sessionId: loginData.sessionId,
      cookieStr,
      customerCode: loginData.customerCode || "",
      defaultRoleCode: loginData.defaultRoleCode || "",
      organizationCode: loginData.organization?.[0]?.organizationCode || "",
    };

    await saveSession(session);
    return { success: true, session };
  } catch (err) {
    console.error("[TER3] login error:", err);
    return {
      success: false,
      error: "Koneksi ke portal PARAMA Pelindo gagal atau timeout.",
    };
  }
}

/**
 * Fetch detailed container tracking from PARAMA Pelindo gateway-8021 API
 * POST https://parama.pelindo.co.id:8031/gateway-8021/api/parama/getContainerDetail
 */
export async function attemptTrack(
  session: Ter3Session | null,
  containerNo: string,
): Promise<Ter3TrackResponse | null> {
  if (!session) return null;

  const trackUrl =
    "https://parama.pelindo.co.id:8031/gateway-8021/api/parama/getContainerDetail";

  try {
    const trackRes = await fetch(trackUrl, {
      method: "POST",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Cookie: session.cookieStr,
        Authorization: session.sessionId,
        token: session.sessionId,
      },
      body: JSON.stringify({
        containerNo,
        terminalCode: "T003",
        terminalCodeBilling: "T003",
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!trackRes.ok) {
      if (trackRes.status === 401) {
        return { code: "0", msg: "No Authorization" };
      }
      return null;
    }
    return (await trackRes.json()) as Ter3TrackResponse;
  } catch (err) {
    console.error("[TER3] attemptTrack error:", err);
    return null;
  }
}

export function normalizeStatus(rec: Ter3DataRec): {
  status: string;
  time: string;
} {
  let finalStatus = rec.statusCode || rec.activity || "UNKNOWN";
  let time = rec.dateStatus || rec.updateTime || "";

  if (rec.handling && Array.isArray(rec.handling) && rec.handling.length > 0) {
    const latest = rec.handling[0];
    let act = latest.activity?.trim() || finalStatus;

    // If yard placement, enrich with yard location if available
    if (
      act.toLowerCase().includes("yard") ||
      act.toLowerCase().includes("stack")
    ) {
      const loc = latest.location || rec.locationSpl || rec.locationJpt;
      if (loc && !act.includes("(")) {
        act = `${act} (${loc})`;
      }
    }

    finalStatus = act;
    time = latest.activityTime?.trim() || time;
  } else {
    if (
      (finalStatus.toLowerCase().includes("yard") ||
        finalStatus.toLowerCase().includes("stack")) &&
      rec.locationSpl &&
      !finalStatus.includes("(")
    ) {
      finalStatus = `${finalStatus} (${rec.locationSpl})`;
    }
  }

  return { status: finalStatus.trim(), time: time.trim() };
}

export async function trackTer3(
  input: TrackInput,
): Promise<TerminalTrackingResult> {
  const { port, containerNo } = input;
  const cleanContainer = containerNo.trim().toUpperCase();

  let session = loadCachedSession();
  if (!session) {
    session = await loadSessionFromDB();
  }

  // If no session cached or in DB, perform login
  if (!session) {
    console.log(`[TER3] No active session found. Performing initial LOGIN...`);
    const loginResult = await login();
    if (!loginResult.success) {
      return {
        success: false,
        port,
        containerNo: cleanContainer,
        error: loginResult.error || "Gagal login ke portal PARAMA / TER3.",
      };
    }
    session = loginResult.session;
  }

  let trackData = await attemptTrack(session, cleanContainer);

  // Check if session expired / unauthorized
  const isUnauthorized =
    !trackData ||
    trackData.msg === "No Authorization" ||
    trackData.detail?.statusCode === 401;

  if (isUnauthorized) {
    console.log(
      `[TER3] Session expired or invalid. Performing re-LOGIN for ${cleanContainer}...`,
    );
    const loginResult = await login();
    if (!loginResult.success) {
      return {
        success: false,
        port,
        containerNo: cleanContainer,
        error:
          loginResult.error || "Sesi PARAMA / TER3 berakhir dan gagal re-login.",
      };
    }
    session = loginResult.session;
    trackData = await attemptTrack(session, cleanContainer);
  }

  if (
    !trackData ||
    trackData.code !== "1" ||
    !trackData.dataRec ||
    Array.isArray(trackData.dataRec) ||
    Object.keys(trackData.dataRec).length === 0
  ) {
    return {
      success: false,
      port,
      containerNo: cleanContainer,
      error: "Container not found in TER3 system.",
    };
  }

  const rec = trackData.dataRec as Ter3DataRec;
  const normalized = normalizeStatus(rec);

  const customerName = rec.customerName?.trim();
  const vesselName = (rec.vessel || rec.vesselvoyage || "").trim();
  const voyage = (rec.voyageIn || rec.voyage || "").trim();

  let customerInfo = "";
  if (vesselName) {
    customerInfo = `Kapal: ${vesselName}${voyage ? ` (${voyage})` : ""}`;
    if (customerName) customerInfo += ` | ${customerName}`;
  } else if (customerName) {
    customerInfo = customerName;
  }

  return {
    success: true,
    port,
    containerNo: cleanContainer,
    status: normalized.status,
    time: normalized.time,
    timeOut: isOutgateStatus(normalized.status) ? normalized.time : undefined,
    customer: customerInfo || undefined,
    raw: rec,
  };
}

export const ter3Tracker: PortTracker = {
  track: trackTer3,
};
