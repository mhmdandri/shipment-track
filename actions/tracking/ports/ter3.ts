import prisma from "@/lib/prisma";
import { PortTracker, TerminalTrackingResult, TrackInput } from "../types";

export interface Ter3Session {
  sessionId: string;
  cookieStr: string;
  customerCode: string;
  defaultRoleCode: string;
  organizationCode: string;
}

interface Ter3HandlingItem {
  activity?: string;
  activityTime?: string;
}

interface Ter3DataRec {
  statusCode?: string;
  updateTime?: string;
  handling?: Ter3HandlingItem[];
}

interface Ter3TrackResponse {
  code?: string;
  dataRec?: Ter3DataRec;
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
  const loginUrl = "https://parama.pelindo.co.id:8031/api/login";

  const loginRes = await fetch(loginUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
    cache: "no-store",
    body: JSON.stringify({
      username: process.env.PARAMA_USERNAME || "Solichin80",
      password: process.env.PARAMA_PASSWORD || "Arnesya@27",
    }),
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
  const cookieStr = rawSetCookies.map((c: string) => c.split(";")[0]).join("; ");

  const session: Ter3Session = {
    sessionId: loginData.sessionId,
    cookieStr,
    customerCode: loginData.customerCode || "",
    defaultRoleCode: loginData.defaultRoleCode || "",
    organizationCode: loginData.organization?.[0]?.organizationCode || "",
  };

  await saveSession(session);
  return { success: true, session };
}

export async function attemptTrack(
  session: Ter3Session | null,
  containerNo: string
): Promise<Ter3TrackResponse | null> {
  if (!session) return null;

  const trackUrl =
    "https://parama.pelindo.co.id:8031/gateway-8021/api/parama/getContainerDetail";

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
  });

  if (!trackRes.ok) return null;
  return (await trackRes.json()) as Ter3TrackResponse;
}

export function normalizeStatus(rec: Ter3DataRec): {
  status: string;
  time: string;
} {
  let finalStatus = rec.statusCode || "UNKNOWN";
  let time = rec.updateTime || "";

  if (rec.handling && Array.isArray(rec.handling) && rec.handling.length > 0) {
    const latest = rec.handling[0];
    finalStatus = latest.activity || finalStatus;
    time = latest.activityTime || time;
  }

  const upperStatus = finalStatus.toUpperCase();
  if (upperStatus.includes("YARD STACK")) {
    finalStatus = "GNSTK";
  } else if (upperStatus.includes("GATE OUT")) {
    finalStatus = "OUTGT";
  }

  return { status: finalStatus, time };
}

export async function trackTer3(
  input: TrackInput
): Promise<TerminalTrackingResult> {
  const { port, containerNo } = input;

  let session = loadCachedSession();
  if (!session) {
    session = await loadSessionFromDB();
  }

  if (session) {
    console.log(`[TER3] Using cached session to track ${containerNo}...`);
  }

  let trackData = await attemptTrack(session, containerNo);

  if (!trackData || trackData.code !== "1") {
    console.log(
      `[TER3] Session empty or expired. Performing LOGIN for ${containerNo}...`
    );
    const loginResult = await login();
    if (!loginResult.success) {
      return {
        success: false,
        port,
        containerNo,
        error: loginResult.error,
      };
    }
    session = loginResult.session;
    trackData = await attemptTrack(session, containerNo);
  }

  if (!trackData || trackData.code !== "1" || !trackData.dataRec) {
    return {
      success: false,
      port,
      containerNo,
      error: "Container not found in TER3 system.",
    };
  }

  const normalized = normalizeStatus(trackData.dataRec);

  return {
    success: true,
    port,
    containerNo,
    status: normalized.status,
    time: normalized.time,
  };
}

export const ter3Tracker: PortTracker = {
  track: trackTer3,
};
