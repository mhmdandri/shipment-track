"use client";

import { useState } from "react";
import VesselTrackerClient from "./VesselTrackerClient";
import { Ship, Clock, Anchor, Calendar, BellOff } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import type { VesselMonitor } from "@/app/generated/prisma/client";
import { disableVesselMonitoringAction } from "@/actions/vessel-action";
import { useRouter } from "next/navigation";

interface VesselTrackerTabProps {
  activeVesselMonitors: VesselMonitor[];
}

function formatDateDisplay(d: Date | null): string {
  if (!d) return "-";
  return new Date(d).toLocaleString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function VesselTrackerTab({ activeVesselMonitors }: VesselTrackerTabProps) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleStopMonitor = async (vesselName: string, port: string, id: string) => {
    setLoadingId(id);
    await disableVesselMonitoringAction(vesselName, port);
    setLoadingId(null);
    router.refresh();
  };

  return (
    <div className="space-y-6">
      {/* Top: Search Form & Tracking Result */}
      <VesselTrackerClient onMonitorChanged={() => router.refresh()} />

      {/* Bottom: Active Vessel Monitors List */}
      <Card className="border-border shadow-sm flex flex-col">
        <CardHeader className="bg-muted/30 border-b border-border pb-4 shrink-0">
          <CardTitle className="text-lg flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Ship className="w-5 h-5 text-primary" /> Active Vessel Monitors
            </span>
            <Badge variant="secondary" className="font-mono">
              {activeVesselMonitors.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {activeVesselMonitors.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground border border-dashed rounded-xl bg-muted/20">
              <p className="text-sm font-medium">
                Belum ada kapal yang sedang dipantau.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeVesselMonitors.map((vMonitor) => {
                const voyStr =
                  vMonitor.voyageIn && vMonitor.voyageOut && vMonitor.voyageIn !== vMonitor.voyageOut
                    ? `${vMonitor.voyageIn} / ${vMonitor.voyageOut}`
                    : vMonitor.voyageIn || vMonitor.voyageOut || "-";

                return (
                  <div
                    key={vMonitor.id}
                    className="p-4 rounded-xl border border-border bg-card flex flex-col gap-3 transition-colors hover:border-primary/30 shadow-xs"
                  >
                    {/* Header: Vessel Name, Port & Status */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-bold font-mono text-base tracking-tight text-foreground">
                          {vMonitor.vesselName}
                        </p>
                        <p className="text-[11px] font-semibold text-muted-foreground mt-0.5">
                          Line: <span className="text-foreground">{vMonitor.line || "-"}</span>
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <Badge
                          variant="outline"
                          className="text-[10px] py-0.5 px-2 font-bold tracking-wider uppercase bg-muted/50"
                        >
                          {vMonitor.port.toUpperCase()}
                        </Badge>
                        <Badge
                          className={`text-[10px] py-0 px-2 font-bold tracking-wider uppercase ${
                            vMonitor.status.toUpperCase() === "ACTIVE" || vMonitor.status.toUpperCase() === "WORKING"
                              ? "bg-emerald-600 text-white"
                              : "bg-blue-600 text-white"
                          }`}
                        >
                          {vMonitor.status}
                        </Badge>
                      </div>
                    </div>

                    {/* Voyage Info */}
                    <div className="bg-muted/40 px-3 py-1.5 rounded-lg flex items-center justify-between text-xs border border-border/50">
                      <span className="text-muted-foreground font-medium">Voyage:</span>
                      <span className="font-bold font-mono text-foreground">{voyStr}</span>
                    </div>

                    {/* Open Stacking Highlight */}
                    <div className="bg-primary/5 p-3 rounded-lg border border-primary/15 text-xs">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-primary" /> Open Stacking
                      </p>
                      <p className="font-bold font-mono text-primary text-sm mt-0.5">
                        {vMonitor.openStacking
                          ? formatDateDisplay(vMonitor.openStacking)
                          : "Belum Tersedia"}
                      </p>
                    </div>

                    {/* ETB / ETA & ETD Grid */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2 rounded-lg border border-border bg-muted/20">
                        <p className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
                          <Anchor className="w-3 h-3 text-blue-500" /> ETB / Sandar
                        </p>
                        <p className="font-bold font-mono text-foreground mt-0.5 text-[11px]">
                          {formatDateDisplay(vMonitor.etb)}
                        </p>
                      </div>

                      <div className="p-2 rounded-lg border border-border bg-muted/20">
                        <p className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-500" /> ETD / Berangkat
                        </p>
                        <p className="font-bold font-mono text-foreground mt-0.5 text-[11px]">
                          {formatDateDisplay(vMonitor.etd)}
                        </p>
                      </div>
                    </div>

                    {/* Footer: Updated Timestamp & Stop Monitoring Button */}
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground font-medium pt-2 border-t border-border mt-1">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3" />
                        Updated{" "}
                        {formatDistanceToNow(new Date(vMonitor.updatedAt), {
                          addSuffix: true,
                        })}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleStopMonitor(vMonitor.vesselName, vMonitor.port, vMonitor.id)}
                        disabled={loadingId === vMonitor.id}
                        className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 px-2 font-bold"
                        title="Stop Monitoring"
                      >
                        <BellOff className="w-3.5 h-3.5 mr-1" />
                        {loadingId === vMonitor.id ? "Stopping..." : "Stop"}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

