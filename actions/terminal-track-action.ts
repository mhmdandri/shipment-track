"use server";

import prisma from "@/lib/prisma";

export interface TerminalTrackingResult {
  success: boolean;
  port: string;
  containerNo: string;
  status?: string;
  time?: string;
  error?: string;
  raw?: unknown;
  isMonitored?: boolean;
}

import { z } from "zod";

const trackInputSchema = z.object({
  port: z.string().min(2),
  containerNo: z.string().min(5, "Container number must be at least 5 characters"),
  vesselName: z.string().optional(),
  voyageNo: z.string().optional(),
});

export async function trackTerminalContainer(
  port: string,
  containerNo: string,
  vesselName?: string,
  voyageNo?: string
): Promise<TerminalTrackingResult> {
  const parsed = trackInputSchema.safeParse({ port, containerNo, vesselName, voyageNo });
  if (!parsed.success) {
    return {
      success: false,
      port,
      containerNo,
      error: parsed.error.errors.map(e => e.message).join(", "),
    };
  }

  const normalizedPort = port.toLowerCase();

  let isMonitored = false;
  try {
    const existing = await prisma.terminalMonitor.findUnique({
      where: { containerNo },
    });
    if (existing && existing.isActive) {
      isMonitored = true;
    }
  } catch (error) {
    console.error("Error checking monitor status:", error);
  }

  try {
    if (normalizedPort === "jict") {
      const params = new URLSearchParams();
      params.set("container", containerNo);
      params.set("type", "I");

      const response = await fetch("https://www.jict.co.id/container-tracking-search", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      });

      if (!response.ok) {
        return {
          success: false,
          port,
          containerNo,
          error: `Error communicating with JICT API (Status ${response.status})`,
        };
      }

      const data = await response.json();
      
      // JICT returns ["00", ...] on success
      if (Array.isArray(data) && data[0] === "00") {
        const status = data[20]; // e.g. "GNSTK"
        const time = data[32]; // e.g. "18/07/2026 13:02"
        return {
          success: true,
          port,
          containerNo,
          status,
          time,
          isMonitored,
        };
      } else if (Array.isArray(data) && data[0] === "99") {
        return {
          success: false,
          port,
          containerNo,
          error: data[1] || "Container not found in JICT system.",
        };
      }

      return {
        success: false,
        port,
        containerNo,
        error: "Failed to parse JICT response.",
      };
    }

    if (normalizedPort === "tmal") {
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
        return {
          success: false,
          port,
          containerNo,
          error: `Error communicating with TMAL (Status ${response.status})`,
        };
      }

      const html = await response.text();
      // Use dynamic import so it doesn't break client components if ever leaked, though this is a server action
      const cheerio = await import("cheerio");
      const $ = cheerio.load(html);

      const tableRows = $("table tbody tr");
      
      let foundStatus = "";
      let foundTime = "";

      tableRows.each((i, row) => {
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
        return {
          success: false,
          port,
          containerNo,
          error: "Container not found in TMAL system.",
        };
      }

      // Normalize TMAL status
      let finalStatus = foundStatus.toUpperCase() === "ON VESSEL" ? "ONVSL" : foundStatus;
      
      // If it's not ONVSL, it's typically a date (Tanggal Bongkar) meaning it's discharged to yard.
      // We normalize it to GNSTK so our monitoring logic treats it uniformly.
      if (finalStatus !== "ONVSL") {
        foundTime = finalStatus; // the date it was discharged
        finalStatus = "GNSTK";
      }

      return {
        success: true,
        port,
        containerNo,
        status: finalStatus,
        time: foundTime,
        isMonitored,
      };
    }

    if (normalizedPort === "koja") {
      const params = new URLSearchParams();
      params.set("CNTR_ID", containerNo);
      params.set("submit", "Show Detail");

      const response = await fetch("https://www.tpkkoja.co.id/online-consignee-container-tracking/", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      });

      if (!response.ok) {
        return {
          success: false,
          port,
          containerNo,
          error: `Error communicating with KOJA (Status ${response.status})`,
        };
      }

      const html = await response.text();
      const cheerio = await import("cheerio");
      const $ = cheerio.load(html);

      const table = $("table#datatables");
      if (table.length === 0) {
        return {
          success: false,
          port,
          containerNo,
          error: "Container not found in KOJA system.",
        };
      }

      let foundStatus = "";
      let foundTime = "";

      table.find("tr").each((_, row) => {
        $(row).find("td").each((i, td) => {
          const text = $(td).text().trim();
          if (text === "Location") {
            foundStatus = $(td).next("td").text().trim();
          }
          if (text === "In Time / Stack CY") {
            foundTime = $(td).next("td").text().trim();
          }
        });
      });

      if (!foundStatus) {
        return {
          success: false,
          port,
          containerNo,
          error: "Failed to parse Location from KOJA response.",
        };
      }

      let finalStatus = foundStatus;
      
      // If "In Time / Stack CY" is filled (meaning it has a valid timestamp),
      // it means the container has secured a yard location, so we map to GNSTK.
      if (foundTime && foundTime.trim() !== "" && foundTime.trim() !== "-") {
        finalStatus = "GNSTK";
      }

      return {
        success: true,
        port,
        containerNo,
        status: finalStatus,
        time: foundTime,     // Stack CY time
        isMonitored,
      };
    }

    if (normalizedPort === "npct1") {
      if (!vesselName || !voyageNo) {
        return {
          success: false,
          port,
          containerNo,
          error: "NPCT1 requires Vessel Code (e.g. EVBIT) and Voyage No.",
        };
      }

      // NPCT1 requires exactly the last 4 characters of the voyage
      const finalVoyage = voyageNo.length > 4 ? voyageNo.slice(-4) : voyageNo;

      const params = new URLSearchParams();
      params.set("vesselTracking", vesselName);
      params.set("vesselVoyage", finalVoyage);
      params.set("vesselDirection", "OUT");
      params.set("vesselContainer", containerNo);

      // 1. Get Session Cookie and CSRF Token
      const initRes = await fetch("https://www.npct1.co.id/");
      
      const setCookies = initRes.headers.getSetCookie ? initRes.headers.getSetCookie() : [];
      const cookieStr = setCookies.map(c => c.split(';')[0]).join('; ');
      
      const initHtml = await initRes.text();
      const tokenMatch = initHtml.match(/name="csrf-token"\s+content="([^"]+)"/);
      const csrfToken = tokenMatch ? tokenMatch[1] : '';

      params.set("_token", csrfToken);

      // 2. POST to /req/container
      const postRes = await fetch("https://www.npct1.co.id/req/container", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Cookie": cookieStr,
          "X-CSRF-TOKEN": csrfToken,
          "X-Requested-With": "XMLHttpRequest",
        },
        body: params.toString(),
      });

      if (!postRes.ok) {
        return {
          success: false,
          port,
          containerNo,
          error: `Error communicating with NPCT1 POST (Status ${postRes.status})`,
        };
      }

      const postJson = await postRes.json();
      if (!postJson.redirect || !postJson.redirect.url) {
         return {
          success: false,
          port,
          containerNo,
          error: "Container not found or invalid Vessel/Voyage in NPCT1.",
        };
      }

      // 3. GET the redirected URL to obtain HTML
      const getHtmlRes = await fetch(postJson.redirect.url, {
         method: "GET",
         headers: {
           "Cookie": cookieStr
         }
      });

      if (!getHtmlRes.ok) {
        return {
          success: false,
          port,
          containerNo,
          error: `Error communicating with NPCT1 GET (Status ${getHtmlRes.status})`,
        };
      }

      const html = await getHtmlRes.text();
      const cheerio = await import("cheerio");
      const $ = cheerio.load(html);

      // Parse status from: <span class="status-desc">...<span class="semi-bold">GATEOUT TERMINAL</span></span>
      const foundStatus = $(".status-desc .semi-bold").text().trim();
      
      if (!foundStatus) {
        return {
          success: false,
          port,
          containerNo,
          error: "Container not found or invalid Vessel/Voyage in NPCT1.",
        };
      }

      // Parse Container In time
      let foundTime = "";
      $("p.hint-text").each((_, el) => {
        if ($(el).text().trim() === "Container In") {
          foundTime = $(el).next("h5").text().trim();
        }
      });

      // Normalize NPCT1 Status
      // NPCT1 returns "STACKING YARD" when it has reached the yard
      let finalStatus = foundStatus.toUpperCase();
      if (finalStatus === "STACKING YARD") {
        finalStatus = "GNSTK";
      }

      // "Log & Observe" Strategy: return the mapped or raw NPCT1 status
      return {
        success: true,
        port,
        containerNo,
        status: finalStatus,
        time: foundTime,
        isMonitored,
      };
    }

    // Fallback for other ports (TER3)
    return {
      success: false,
      port,
      containerNo,
      error: `Tracking for port ${port.toUpperCase()} is not implemented yet.`,
    };
  } catch (error) {
    console.error(`Terminal Tracking Error (${port}):`, error);
    return {
      success: false,
      port,
      containerNo,
      error: error instanceof Error ? error.message : "An unexpected error occurred.",
    };
  }
}
