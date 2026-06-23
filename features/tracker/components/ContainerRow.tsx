"use client";

import { useState } from "react";
import { format } from "date-fns";
import { 
  PackageOpen, 
  ArrowRightLeft, 
  Anchor, 
  Ship, 
  Truck, 
  CheckCircle2, 
  Weight, 
  MapPin, 
  Calendar, 
  ChevronUp, 
  ChevronDown 
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { UnifiedTrackingResult, TrackingEvent } from "@/actions/track-action";

interface MilestoneDef {
  key: string;
  label: string;
  keywords: string[];
  icon: React.ComponentType<{ className?: string }>;
}

const MILESTONES: MilestoneDef[] = [
  { key: "release", label: "Empty Picked Up", keywords: ["picked up", "empty release", "empty out"], icon: PackageOpen },
  { key: "gatein", label: "Gate In", keywords: ["gate in", "gate-in", "terminal arrival", "received"], icon: ArrowRightLeft },
  { key: "boarded", label: "Loaded on Vessel", keywords: ["loaded", "boarded", "departure"], icon: Anchor },
  { key: "discharged", label: "Discharged", keywords: ["discharge", "vessel arrival", "arrived"], icon: Ship },
  { key: "gateout", label: "Gate Out", keywords: ["gate out", "gate-out", "picked up by", "import picked"], icon: Truck },
  { key: "returned", label: "Empty Returned", keywords: ["returned", "empty return", "depot"], icon: CheckCircle2 }
];

interface ContainerRowProps {
  container: UnifiedTrackingResult["containers"][0];
  resultEta?: string;
  resultPodName?: string;
}

export function ContainerRow({ 
  container,
  resultEta,
  resultPodName
}: ContainerRowProps) {
  const [expanded, setExpanded] = useState(false);

  // Map events to our milestone checklist
  const milestoneEvents = MILESTONES.map((m) => {
    // Find the first event that matches any of the keywords
    const event = container.events.find((evt) =>
      m.keywords.some((kw) => evt.eventName.toLowerCase().includes(kw.toLowerCase()))
    );

    const isActual = event ? event.triggerType.toUpperCase() === "ACTUAL" : false;
    let isEstimated = event ? (event.triggerType.toUpperCase() === "ESTIMATED" || event.triggerType.toUpperCase() === "PLANNED") : false;
    let date = event ? event.date : null;
    let location = event ? `${event.locationName}${event.countryCode ? `, ${evtCountry(event)}` : ""}` : null;

    // Fallback for discharged milestone if not reached, but top-level ETA exists
    if (m.key === "discharged" && !event && resultEta) {
      date = resultEta;
      isEstimated = true;
      location = resultPodName || null;
    }

    return {
      key: m.key,
      label: m.label,
      reached: !!event && isActual,
      date,
      triggerType: event ? event.triggerType : (isEstimated ? "ESTIMATED" : null),
      isEstimated,
      location,
      icon: m.icon
    };
  });

  // Helper to format country code / name nicely
  function evtCountry(event: TrackingEvent) {
    return event.countryName || event.countryCode || "";
  }

  // Calculate overall progress index
  const lastReachedIndex = [...milestoneEvents].reverse().findIndex((m) => m.reached);
  const currentStepIndex = lastReachedIndex === -1 ? 0 : milestoneEvents.length - 1 - lastReachedIndex;
  
  // Format date helper
  const formatDateStr = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "dd MMM yyyy HH:mm");
    } catch {
      return dateStr;
    }
  };

  // Format milestone date helper
  const formatMilestoneDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const hasTime = dateStr.includes("T") || dateStr.includes(":") || dateStr.includes(" ");
      if (hasTime) {
        return format(d, "dd MMM HH:mm");
      } else {
        return format(d, "dd MMM yyyy");
      }
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden hover:border-muted-foreground/30 transition-all">
      {/* Container Header */}
      <div className="p-6 border-b border-border bg-muted/20">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-lg font-black tracking-tight text-foreground font-mono">
                {container.containerNo || "No Container Number"}
              </span>
              <Badge variant="secondary" className="font-semibold text-[11px]">
                {container.containerTypeSize}
              </Badge>
            </div>
            {container.weight && (
              <p className="text-xs text-muted-foreground font-semibold flex items-center gap-1">
                <Weight className="w-3.5 h-3.5" /> Gross Cargo Weight: {container.weight}
              </p>
            )}
            {container.place && container.place.yardName && (
              <p className="text-xs text-muted-foreground font-semibold flex items-center gap-1 mt-0.5">
                <MapPin className="w-3.5 h-3.5 text-primary" />
                <span>
                  Yard/Terminal Location: <span className="font-bold text-foreground">
                    {container.place.yardCode?.includes("UTC1") || container.place.yardName.toUpperCase().includes("JICT") ? "JICT (Jakarta International Container Terminal)" :
                     container.place.yardCode?.includes("UTC3") || container.place.yardName.toUpperCase().includes("KOJA") ? "KOJA (TPK Koja)" :
                     container.place.yardCode?.toUpperCase().includes("NPCT") || container.place.yardName.toUpperCase().includes("NPCT") ? "NPCT1 (New Priok Container Terminal 1)" :
                     container.place.yardName.toUpperCase().includes("MUSTIKA ALAM") || container.place.yardName.toUpperCase().includes("MAL") || container.place.yardCode?.toUpperCase().includes("T300") ? "TMAL (Terminal Mustika Alam Lestari)" :
                     container.place.yardName.toUpperCase().includes("TERMINAL 3") || container.place.yardName.toUpperCase().includes("TER3") ? "TER3 (Terminal 3)" :
                     container.place.yardName}
                  </span>
                  {container.place.yardCode ? ` (${container.place.yardCode})` : ""}
                </span>
              </p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            {container.latestEvent && (
              <div className="bg-card border border-border px-3.5 py-2 rounded-xl text-xs flex flex-col gap-0.5">
                <span className="text-muted-foreground uppercase tracking-wider text-[9px] font-bold">Latest Event</span>
                <span className="font-black text-foreground">{container.latestEvent.eventName}</span>
                {container.latestEvent.locationName && (
                  <span className="text-muted-foreground font-semibold font-mono text-[10px]">
                    @{container.latestEvent.locationName} &bull; {formatDateStr(container.latestEvent.date)}
                  </span>
                )}
              </div>
            )}
            <button
              onClick={() => setExpanded(!expanded)}
              className="px-4 py-2 border border-border bg-card rounded-xl text-xs font-bold hover:bg-muted transition-colors flex items-center justify-center gap-1.5"
            >
              <span>{expanded ? "Hide Timeline" : "Show Timeline"}</span>
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Horizontal Milestone Tracker Bar */}
      <div className="p-6">
        <div className="relative">
          {/* Progress bar line */}
          <div className="absolute top-4.5 left-[5%] right-[5%] h-1 bg-border hidden md:block" />
          <div 
            className="absolute top-4.5 left-[5%] h-1 bg-primary transition-all duration-500 hidden md:block" 
            style={{ width: `${(currentStepIndex / (milestoneEvents.length - 1)) * 90}%` }}
          />

          <div className="grid grid-cols-2 md:grid-cols-6 gap-6 relative">
            {milestoneEvents.map((m, idx) => {
              const isCompleted = m.reached;
              const isActive = idx === currentStepIndex && isCompleted;
              const IconComponent = m.icon;
              
              return (
                <div key={m.key} className="flex flex-col items-center text-center space-y-2 md:space-y-3">
                  {/* Indicator Dot with Context Icon */}
                  <div 
                    className={`w-9 h-9 rounded-full border flex items-center justify-center z-10 transition-all duration-300
                      ${isCompleted 
                        ? "bg-primary border-primary text-primary-foreground shadow-sm shadow-primary/20" 
                        : m.isEstimated
                          ? "bg-amber-50/50 border-amber-300 dark:bg-amber-950/20 dark:border-amber-800 text-amber-600 dark:text-amber-400 border-dashed animate-pulse"
                          : "bg-card border-border text-muted-foreground"
                      }
                      ${isActive ? "ring-4 ring-primary/20 scale-105" : "hover:scale-105"}
                    `}
                  >
                    <IconComponent className={isCompleted || m.isEstimated ? "w-4.5 h-4.5 font-bold" : "w-4 h-4 opacity-80"} />
                  </div>

                  {/* Milestone Labels */}
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold block text-foreground leading-tight">
                      {m.label}
                    </span>
                    {m.date ? (
                      <span className={`text-[9px] font-mono font-semibold block leading-tight ${
                        m.isEstimated 
                          ? "text-amber-600 dark:text-amber-400" 
                          : "text-muted-foreground"
                      }`}>
                        {m.isEstimated ? "Est: " : ""}{formatMilestoneDate(m.date)}
                      </span>
                    ) : (
                      <span className="text-[9px] font-semibold text-muted-foreground/40 block leading-tight">
                        Pending
                      </span>
                    )}
                    {m.location && (
                      <span className={`text-[8px] font-bold block truncate max-w-30 uppercase tracking-wider mx-auto ${
                        m.isEstimated ? "text-amber-600/80 dark:text-amber-400/80" : "text-muted-foreground"
                      }`}>
                        @{m.location.split(",")[0]}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Expanded Detailed Event Timeline */}
      {expanded && (
        <div className="p-6 bg-muted/10 border-t border-border animate-slide-down">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-6">
            Detailed Cargo Event Logs
          </h4>
          
          <div className="relative border-l border-border ml-3 md:ml-6 pl-6 md:pl-8 space-y-6">
            {container.events.map((evt, eIdx) => {
              const isActual = evt.triggerType.toUpperCase() === "ACTUAL";
              
              return (
                <div key={eIdx} className="relative group">
                  {/* Circle Indicator on vertical line */}
                  <div className={`absolute w-3 h-3 rounded-full -left-7.5 md:-left-9.5 top-1.5 border z-10 transition-colors
                    ${isActual 
                      ? "bg-primary border-primary shadow-sm" 
                      : "bg-card border-dashed border-muted-foreground"
                    }`} 
                  />

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-start bg-card border border-border/80 hover:border-border p-4 rounded-xl shadow-xs transition-colors">
                    {/* Timestamp */}
                    <div className="md:col-span-1 font-mono text-xs font-bold text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{formatDateStr(evt.date)}</span>
                      </div>
                      <Badge variant="outline" className={`mt-1.5 text-[9px] font-extrabold uppercase px-1.5 py-px ${
                        isActual ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-orange-50 text-orange-700 border-orange-200 border-dashed"
                      }`}>
                        {evt.triggerType}
                      </Badge>
                    </div>

                    {/* Milestone Name */}
                    <div className="md:col-span-2 space-y-1">
                      <p className="text-sm font-black text-foreground">
                        {evt.eventName}
                      </p>
                      {evt.locationName && (
                        <p className="text-xs text-muted-foreground font-semibold flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-muted-foreground/60" />
                          <span>{evt.locationName}{evt.countryName ? `, ${evt.countryName}` : ""}</span>
                        </p>
                      )}
                    </div>

                    {/* Yard / Location */}
                    <div className="md:col-span-1 md:text-right text-xs font-medium text-muted-foreground">
                      {evt.countryCode && (
                        <span className="bg-muted px-2 py-1 rounded-lg font-bold border border-border uppercase">
                          {evt.countryCode}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
