"use server";

import { trackTerminalContainer as trackInternal } from "./tracking";
import type { TerminalTrackingResult } from "./tracking/types";

export async function trackTerminalContainer(
  port: string,
  containerNo: string,
  vesselName?: string,
  voyageNo?: string
): Promise<TerminalTrackingResult> {
  return trackInternal(port, containerNo, vesselName, voyageNo);
}
