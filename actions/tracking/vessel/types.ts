export interface VesselScheduleItem {
  vessel: string;
  line: string;
  voyIn: string;
  voyOut: string;
  service: string;
  status: string; // REGISTER, ACTIVE, BERTHING, SAILING, etc.
  eta?: string | null;
  etb: string | null;
  ata: string | null;
  etd: string | null;
  atd: string | null;
  openStacking: string | null;
  closingDoc: string | null;
  closingPhysic: string | null;
  port?: string;
}

export interface VesselTrackingResult {
  success: boolean;
  port: string;
  vesselName: string;
  schedules: VesselScheduleItem[];
  selectedSchedule: VesselScheduleItem | null;
  error?: string;
}

export interface VesselTracker {
  trackVessel(vesselName: string, line?: string): Promise<VesselTrackingResult>;
}
