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

export async function trackTerminalContainer(
  port: string,
  containerNo: string
): Promise<TerminalTrackingResult> {
  if (!containerNo || containerNo.trim() === "") {
    return {
      success: false,
      port,
      containerNo,
      error: "Container number cannot be empty.",
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

    // Fallback for other ports (NPCT1, KOJA, TER3)
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
