"use server";

import { trackTerminalContainer as trackInternal } from "./tracking";
import type { TerminalTrackingResult } from "./tracking/types";
import { requireAuth } from "@/lib/auth";

export async function trackTerminalContainer(
  port: string,
  containerNo: string,
  vesselName?: string,
  voyageNo?: string
): Promise<TerminalTrackingResult> {
  await requireAuth();
  return trackInternal(port, containerNo, vesselName, voyageNo);
}
