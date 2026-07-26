import prisma from "@/lib/prisma";
import { ContainerTrackerTab } from "@/features/tracker/ContainerTrackerTab";
import { VesselTrackerTab } from "@/features/tracker/VesselTrackerTab";
import { Anchor, Ship } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Forces Next.js not to cache the page (real-time data)
export const dynamic = "force-dynamic";

export default async function TerminalTrackerPage() {
  const [activeMonitors, activeVesselMonitors] = await Promise.all([
    prisma.terminalMonitor.findMany({
      where: { isActive: true },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.vesselMonitor.findMany({
      where: { isActive: true },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  return (
    <div className="space-y-6 p-4 pt-16 lg:pt-6 lg:p-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
          <Anchor className="w-6 h-6 text-primary" />
          Terminal Container & Vessel Tracker
        </h1>
        <p className="text-muted-foreground text-sm font-medium">
          Lacak lokasi kontainer pelabuhan & jadwal Open Stacking kapal pelabuhan secara real-time.
        </p>
      </div>

      <Tabs defaultValue="container" className="w-full space-y-6">
        <TabsList className="grid grid-cols-2 w-full max-w-md font-bold">
          <TabsTrigger value="container" className="flex items-center gap-2">
            <Anchor className="w-4 h-4" /> Container Tracker
          </TabsTrigger>
          <TabsTrigger value="vessel" className="flex items-center gap-2">
            <Ship className="w-4 h-4" /> Vessel Open Stack
          </TabsTrigger>
        </TabsList>

        <TabsContent value="container">
          <ContainerTrackerTab activeMonitors={activeMonitors} />
        </TabsContent>

        <TabsContent value="vessel">
          <VesselTrackerTab activeVesselMonitors={activeVesselMonitors} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
