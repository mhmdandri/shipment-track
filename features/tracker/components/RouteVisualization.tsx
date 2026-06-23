"use client";

import { Anchor, MapPin, CheckCircle2, Clock, Ship } from "lucide-react";
import { UnifiedTrackingResult } from "@/actions/track-action";

interface ETAInfo {
  date: string | null;
  type: string;
  text: string;
  isActual: boolean;
}

interface RouteVisualizationProps {
  result: UnifiedTrackingResult;
  shipPos: "pol" | "sea" | "pod";
  etaInfo: ETAInfo;
}

export function RouteVisualization({ result, shipPos, etaInfo }: RouteVisualizationProps) {
  if (!result.polName && !result.podName) return null;

  return (
    <div className="border-t border-dashed border-border mt-8 pt-8 grid grid-cols-1 md:grid-cols-7 items-center gap-6">
      {/* Port of Loading */}
      <div className="md:col-span-2 space-y-1.5 p-4 rounded-2xl bg-muted/30 border border-border/50 transition-colors hover:bg-muted/50">
        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1">
          <Anchor className="w-3.5 h-3.5 text-muted-foreground/80" /> Origin Port (POL)
        </span>
        <p className="text-sm font-black text-foreground truncate" title={result.polName}>
          {result.polName?.split(",")[0] || "Origin Port"}
        </p>
        <p className="text-xs text-muted-foreground font-semibold truncate">
          {result.polName?.split(",")[1]?.trim() || "POL Country"}
        </p>
      </div>
      
      {/* Transit Line and Ship Position */}
      <div className="hidden md:flex md:col-span-3 flex-col items-center justify-center relative px-4">
        <div className="w-full border-t-2 border-dashed border-border absolute top-1/2 -translate-y-1/2" />
        
        <div className="flex items-center justify-between w-full relative z-10">
          {/* Ship status indicators */}
          <div 
            className={`w-3.5 h-3.5 rounded-full border border-card transition-all duration-300
              ${shipPos === "pol" ? "bg-primary ring-4 ring-primary/20 scale-125" : "bg-muted-foreground/30"}`} 
          />
          
          {/* Sailing Ship Animation */}
          {shipPos === "sea" ? (
            <div className="bg-primary text-primary-foreground p-2 rounded-full shadow-md animate-bounce ring-4 ring-primary/10">
              <Ship className="w-5 h-5" />
            </div>
          ) : (
            <div className="w-5 h-5 border border-dashed border-muted-foreground/45 rounded-full flex items-center justify-center bg-card">
              <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />
            </div>
          )}

          <div 
            className={`w-3.5 h-3.5 rounded-full border border-card transition-all duration-300
              ${shipPos === "pod" ? "bg-emerald-500 ring-4 ring-emerald-500/20 scale-125 shadow-sm" : "bg-muted-foreground/30"}`} 
          />
        </div>

        {shipPos === "sea" && (
          <span className="text-[9px] font-black uppercase text-primary tracking-widest mt-6 animate-pulse">
            Vessel in Transit
          </span>
        )}
      </div>

      {/* Port of Discharge */}
      <div className={`md:col-span-2 space-y-1.5 p-4 rounded-2xl border transition-all duration-300 md:text-right
        ${shipPos === "pod" 
          ? "bg-emerald-50/40 border-emerald-200 dark:bg-emerald-950/10 dark:border-emerald-900/50" 
          : "bg-muted/30 border-border/50 hover:bg-muted/50"}`}>
        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center md:justify-end gap-1">
          <MapPin className="w-3.5 h-3.5 text-muted-foreground/80" /> Discharge Port (POD)
        </span>
        <p className="text-sm font-black text-foreground truncate" title={result.podName}>
          {result.podName?.split(",")[0] || "Destination Port"}
        </p>
        <p className="text-xs text-muted-foreground font-semibold truncate">
          {result.podName?.split(",")[1]?.trim() || "POD Country"}
        </p>
        {etaInfo.date && (
          <div className="mt-2 pt-2 border-t border-border/50 flex items-center md:justify-end gap-1 text-[10px] font-bold">
            {etaInfo.isActual ? (
              <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Arrived: {etaInfo.text}
              </span>
            ) : (
              <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <Clock className="w-3 h-3 animate-pulse" /> Est. ETA: {etaInfo.text}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
