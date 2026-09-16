import { Metadata } from "next";
import { VesselTrackerTab } from "@/features/tracker/VesselTrackerTab";
import { Compass } from "lucide-react";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Vessel Track & Multi-Port Open Stack Monitor | CS Eksim Tracker",
  description:
    "Pelacakan real-time & auto-monitoring jadwal kapal serta Open Stacking serentak di 5 pelabuhan domestik (JICT, NPCT1, KOJA, TMAL, TER3).",
};

async function getActiveVesselMonitors() {
  return prisma.vesselMonitor.findMany({
    where: { isActive: true },
    orderBy: { updatedAt: "desc" },
  });
}

export default async function VesselTrackPage() {
  const activeVesselMonitors = await getActiveVesselMonitors();

  return (
    <div className="space-y-6 p-4 pt-16 lg:pt-6 lg:p-8 min-h-screen bg-background">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
          <Compass className="w-6 h-6 text-primary" />
          Vessel Track & Multi-Port Monitor
        </h1>
        <p className="text-sm text-muted-foreground font-medium">
          Lacak jadwal kapal & Open Stacking secara real-time di 5 pelabuhan domestik (JICT, NPCT1, KOJA, TMAL, TER3) atau daftarkan pemantauan otomatis untuk kapal yang belum terdaftar.
        </p>
      </div>

      <VesselTrackerTab activeVesselMonitors={activeVesselMonitors} />
    </div>
  );
}

