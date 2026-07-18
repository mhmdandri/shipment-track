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

    // Fallback for other ports (NPCT1, KOJA, TMAL, TER3)
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
