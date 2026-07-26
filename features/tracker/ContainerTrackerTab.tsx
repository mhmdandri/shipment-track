import TerminalTrackerClient from "./TerminalTrackerClient";
import { Activity, Clock } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import type { TerminalMonitor } from "@/app/generated/prisma/client";

interface ContainerTrackerTabProps {
  activeMonitors: TerminalMonitor[];
}

export function ContainerTrackerTab({ activeMonitors }: ContainerTrackerTabProps) {
  return (
    <div className="space-y-6">
      {/* Top: Search Form & Tracking Result */}
      <TerminalTrackerClient />

      {/* Bottom: Active Container Monitors List */}
      <Card className="border-border shadow-sm flex flex-col">
        <CardHeader className="bg-muted/30 border-b border-border pb-4 shrink-0">
          <CardTitle className="text-lg flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" /> Active Container Monitors
            </span>
            <Badge variant="secondary" className="font-mono">
              {activeMonitors.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {activeMonitors.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground border border-dashed rounded-xl bg-muted/20">
              <p className="text-sm font-medium">
                No containers are currently being monitored.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeMonitors.map((monitor) => (
                <div
                  key={monitor.id}
                  className="p-4 rounded-xl border border-border bg-card flex flex-col gap-3 transition-colors hover:border-primary/30"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold font-mono tracking-tight text-foreground">
                        {monitor.containerNo}
                      </p>
                      <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mt-1">
                        {monitor.port}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className="text-[10px] py-0 font-bold tracking-wider"
                    >
                      {monitor.status}
                    </Badge>
                  </div>

                  {(monitor.vesselName || monitor.voyageNo) && (
                    <div className="bg-muted px-2 py-1.5 rounded-md flex items-center gap-2 text-xs font-medium text-muted-foreground">
                      {monitor.vesselName && (
                        <span>Vessel: {monitor.vesselName}</span>
                      )}
                      {monitor.voyageNo && (
                        <span>Voyage: {monitor.voyageNo}</span>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium pt-1 border-t border-border mt-1">
                    <Clock className="w-3.5 h-3.5" />
                    Updated{" "}
                    {formatDistanceToNow(new Date(monitor.updatedAt), {
                      addSuffix: true,
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
