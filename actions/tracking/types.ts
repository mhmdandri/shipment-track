import { z } from "zod";

export interface TerminalTrackingResult {
  success: boolean;
  port: string;
  containerNo: string;
  status?: string;
  time?: string;
  timeOut?: string;
  ob?: string;
  obName?: string;
  error?: string;
  raw?: unknown;
  isMonitored?: boolean;
  customer?: string;
}

export interface TrackInput {
  port: string;
  containerNo: string;
  vesselName?: string;
  voyageNo?: string;
}

export const trackInputSchema = z.object({
  port: z.string().min(2),
  containerNo: z
    .string()
    .min(5, "Container number must be at least 5 characters"),
  vesselName: z.string().optional(),
  voyageNo: z.string().optional(),
});

export interface PortTracker {
  track(input: TrackInput): Promise<TerminalTrackingResult>;
}
