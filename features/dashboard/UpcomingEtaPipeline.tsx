"use client";

import Link from "next/link";
import { format, differenceInCalendarDays, startOfDay } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Anchor, CalendarDays, Ship } from "lucide-react";

import { ShipmentWithTasks } from "@/lib";

interface UpcomingEtaPipelineProps {
  shipments: ShipmentWithTasks[];
}

export function UpcomingEtaPipeline({ shipments }: UpcomingEtaPipelineProps) {
  const now = startOfDay(new Date());

  const getTargetDate = (shipment: ShipmentWithTasks) => {
    if (shipment.type === "EXPORT") {
      return shipment.openCy ? new Date(shipment.openCy) : new Date(shipment.etd);
    }
    return new Date(shipment.eta);
  };

  // Sort shipments chronologically by target date (ETA for Import, Open CY/ETD for Export)
  const sortedShipments = [...shipments].sort(
    (a, b) => getTargetDate(a).getTime() - getTargetDate(b).getTime()
  );

  return (
    <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden flex flex-col">
      <div className="p-4 sm:p-5 border-b border-border">
        <h3 className="font-bold text-foreground text-sm tracking-wide uppercase flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-primary" /> Upcoming ETA Pipeline Schedule
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5 font-medium">
          Chronological timeline of estimated vessel arrival dates.
        </p>
      </div>

      <div className="p-4 sm:p-5">
        {sortedShipments.length === 0 ? (
          <p className="text-sm text-muted-foreground font-medium text-center py-8">
            No active shipments scheduled for arrival.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {sortedShipments.map((shipment) => {
              const isExport = shipment.type === "EXPORT";
              const targetDate = getTargetDate(shipment);
              const daysDiff = differenceInCalendarDays(targetDate, now);

              // Calculate status badge style based on proximity of ETA
              let badgeColor = "bg-muted text-muted-foreground border-border";
              let badgeText = "";

              if (daysDiff < 0) {
                badgeColor = "bg-destructive/10 text-destructive border-destructive/30";
                badgeText = `${Math.abs(daysDiff)}d Overdue`;
              } else if (daysDiff === 0) {
                badgeColor = "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 animate-pulse";
                badgeText = "Arriving Today";
              } else if (daysDiff === 1) {
                badgeColor = "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
                badgeText = "Tomorrow";
              } else if (daysDiff <= 7) {
                badgeColor = "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
                badgeText = `${daysDiff} days left`;
              } else {
                badgeColor = "bg-secondary text-secondary-foreground border-border";
                badgeText = `In ${daysDiff} days`;
              }

              return (
                <div
                  key={shipment.id}
                  className="bg-muted/30 border border-border rounded-xl p-4 flex flex-col justify-between gap-3 hover:border-border/80 transition-colors shadow-sm"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <Link
                        href={`/shipments/${shipment.id}`}
                        className="font-bold text-foreground hover:text-primary hover:underline text-sm truncate"
                        title="View details"
                      >
                        {shipment.jobNo}
                      </Link>
                      <Badge variant="outline" className={`text-[10px] font-bold px-2 py-0.5 shrink-0 ${badgeColor}`}>
                        {badgeText}
                      </Badge>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold">
                        <Ship className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
                        <span className="truncate">{shipment.vessel}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold">
                        <Anchor className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
                        <span className="truncate">POD: {shipment.portOfDischarge}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-border/60 flex items-center justify-between gap-2 mt-auto">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                        {isExport ? (shipment.openCy ? "Open CY" : "ETD Departure") : "ETA Arrival"}
                      </span>
                      <span className="text-xs font-bold text-foreground">
                        {format(targetDate, "dd MMM yyyy")}
                      </span>
                      {isExport && shipment.openCy && (
                        <span className="text-[9px] text-muted-foreground mt-0.5">
                          ETD: {format(new Date(shipment.etd), "dd MMM yyyy")}
                        </span>
                      )}
                    </div>
                    <Button variant="ghost" size="icon-xs" className="rounded-lg hover:bg-muted" asChild>
                      <Link href={`/shipments/${shipment.id}`} title="Inspect Shipment">
                        <Anchor className="w-3 h-3 text-muted-foreground" />
                      </Link>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
