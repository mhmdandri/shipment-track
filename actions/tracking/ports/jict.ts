import tls from "tls";
import { PortTracker, TerminalTrackingResult, TrackInput } from "../types";
import { getCheerio } from "../utils";

function tlsFetch(
  hostname: string,
  path: string,
  postData: string,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const socket = tls.connect(
      {
        host: hostname,
        port: 443,
        servername: hostname,
      },
      () => {
        const request =
          `POST ${path} HTTP/1.1\r\n` +
          `Host: ${hostname}\r\n` +
          `Content-Type: application/x-www-form-urlencoded\r\n` +
          `Content-Length: ${Buffer.byteLength(postData)}\r\n` +
          `Connection: close\r\n\r\n` +
          postData;
        socket.write(request);
      },
    );

    let data = Buffer.alloc(0);
    socket.on("data", (chunk) => {
      data = Buffer.concat([data, chunk]);
    });

    socket.on("end", () => {
      const str = data.toString("utf-8");
      const sep = str.indexOf("\r\n\r\n");
      if (sep === -1) {
        resolve(str);
        return;
      }
      const body = str.substring(sep + 4);
      let result = "";
      let i = 0;
      while (i < body.length) {
        const crlf = body.indexOf("\r\n", i);
        if (crlf === -1) break;
        const sizeStr = body.substring(i, crlf);
        const size = parseInt(sizeStr, 16);
        if (isNaN(size) || size === 0) break;
        result += body.substring(crlf + 2, crlf + 2 + size);
        i = crlf + 2 + size + 2;
      }
      // If chunked parsing yielded nothing, return raw body (maybe not chunked)
      resolve(result || body);
    });

    socket.on("error", (err) => {
      reject(err);
    });
  });
}

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
    const customer = (data[26] as string) || "";
    return {
      success: true,
      port,
      containerNo,
      status,
      time,
      timeOut,
      customer,
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

export async function checkJictOb(
  containerNo: string,
): Promise<{ ob: string; obName: string } | null> {
  try {
    const params = new URLSearchParams();
    params.set("contNo", containerNo);

    const html = await tlsFetch(
      "bcondemand.jict.co.id",
      "/infContainer.php",
      params.toString(),
    );
    const $ = await getCheerio(html);

    let ob = "";
    let obName = "";

    $(".col-sm-3").each((_, el) => {
      const text = $(el).text().trim().toUpperCase();
      if (text === "TRX TYPE ID") {
        ob = $(el).next(".col-sm-3").text().trim();
      } else if (text === "CUSTOMER") {
        obName = $(el).next(".col-sm-3").text().trim();
      }
    });

    if (ob) {
      return { ob, obName };
    }
  } catch (error) {
    console.error("Error checking JICT OB:", error);
  }
  return null;
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

  const parsed = parseResponse(apiRes.data, port, containerNo);

  if (parsed.success) {
    const obData = await checkJictOb(containerNo);
    if (obData) {
      parsed.ob = obData.ob;
      parsed.obName = obData.obName;
    }
  }

  return parsed;
}

export const jictTracker: PortTracker = {
  track: trackJict,
};
