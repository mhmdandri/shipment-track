import { PortTracker, TerminalTrackingResult, TrackInput } from "../types";

export async function callApi(
  containerNo: string,
): Promise<{ ok: boolean; status: number; data?: unknown }> {
  const params = new URLSearchParams();
  params.set("container", containerNo);
  params.set("type", "I");

  const response = await fetch(
    "https://www.jict.co.id/container-tracking-search",
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

  const data = await response.json();
  return { ok: true, status: response.status, data };
}

export function parseResponse(
  data: unknown,
  port: string,
  containerNo: string,
): TerminalTrackingResult {
  // JICT returns ["00", ...] on success
  if (Array.isArray(data) && data[0] === "00") {
    const status = (data[20] as string) || "";
    const time = (data[32] as string) || "";
    const timeOut = (data[31] as string) || "";
    return {
      success: true,
      port,
      containerNo,
      status,
      time,
      timeOut,
    };
  } else if (Array.isArray(data) && data[0] === "99") {
    return {
      success: false,
      port,
      containerNo,
      error: (data[1] as string) || "Container not found in JICT system.",
    };
  }

  return {
    success: false,
    port,
    containerNo,
    error: "Failed to parse JICT response.",
  };
}

export async function trackJict(
  input: TrackInput,
): Promise<TerminalTrackingResult> {
  const { port, containerNo } = input;
  const apiRes = await callApi(containerNo);

  if (!apiRes.ok) {
    return {
      success: false,
      port,
      containerNo,
      error: `Error communicating with JICT API (Status ${apiRes.status})`,
    };
  }

  return parseResponse(apiRes.data, port, containerNo);
}

export const jictTracker: PortTracker = {
  track: trackJict,
};
