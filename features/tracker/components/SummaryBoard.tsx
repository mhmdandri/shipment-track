"use client";

import { Calendar, Anchor, CheckCircle2, Container } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { UnifiedTrackingResult } from "@/actions/track-action";

interface ETAInfo {
  date: string | null;
  type: string;
  text: string;
  isActual: boolean;
}

interface TerminalInfo {
  name: string;
  label: string;
  isDepot: boolean;
}

interface OverallStatus {
  label: string;
  color: string;
  desc: string;
}

interface SummaryBoardProps {
  result: UnifiedTrackingResult;
  etaInfo: ETAInfo;
  berthingPort: string;
  terminalInfo: TerminalInfo;
  overallStatus: OverallStatus;
}

export function SummaryBoard({
  result,
  etaInfo,
  berthingPort,
  terminalInfo,
  overallStatus,
}: SummaryBoardProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      {/* Card 1: ETA */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4 hover:border-primary/20 transition-all duration-300 relative group overflow-hidden">
        {/* subtle accent glow */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl -mr-6 -mt-6 group-hover:bg-amber-500/10 transition-colors" />
        
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            {etaInfo.isActual ? "Berthing/Arrival Date" : "Estimated Arrival (ETA)"}
          </span>
          <div className="p-2.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl">
            <Calendar className="w-5 h-5" />
          </div>
        </div>
        <div className="space-y-1 relative z-10">
          <p className="text-lg font-black text-foreground tracking-tight leading-tight font-mono">
            {etaInfo.text}
          </p>
          <div className="flex items-center gap-1.5 mt-1.5">
            <Badge 
              variant="outline" 
              className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${
                etaInfo.isActual 
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/60" 
                  : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/60"
              }`}
            >
              {etaInfo.type}
            </Badge>
            <span className="text-[10px] text-muted-foreground font-bold">
              Arrival milestone status
            </span>
          </div>
        </div>
      </div>

      {/* Card 2: Port Sandar & Terminal */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4 hover:border-primary/20 transition-all duration-300 relative group overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl -mr-6 -mt-6 group-hover:bg-blue-500/10 transition-colors" />
        
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            Berthing Port (Port Sandar)
          </span>
          <div className="p-2.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl">
            <Anchor className="w-5 h-5" />
          </div>
        </div>
        <div className="space-y-1.5 relative z-10">
          <p className="text-lg font-black text-foreground tracking-tight leading-tight truncate" title={berthingPort}>
            {berthingPort.split(",")[0]}
          </p>
          <div className="flex flex-col gap-1.5">
            <p className="text-xs text-muted-foreground font-semibold truncate">
              {berthingPort.split(",")[1]?.trim() || "Destination Country"}
            </p>
            {/* Terminal berth badge */}
            <div className="flex items-center gap-1.5 pt-0.5">
              <Badge 
                variant="outline" 
                className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${
                  terminalInfo.label === "N/A" 
                    ? "bg-secondary text-secondary-foreground border-border dark:border-zinc-800" 
                    : terminalInfo.isDepot
                      ? "bg-gray-50 text-gray-600 border-gray-200 dark:bg-zinc-800/40 dark:text-zinc-400 dark:border-zinc-700"
                      : "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/60"
                }`}
              >
                {terminalInfo.label}
              </Badge>
              <span className="text-[10px] text-muted-foreground font-black truncate max-w-32.5" title={terminalInfo.name}>
                {terminalInfo.name}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Card 3: Status */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4 hover:border-primary/20 transition-all duration-300 relative group overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl -mr-6 -mt-6 group-hover:bg-emerald-500/10 transition-colors" />
        
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            Operational Status
          </span>
          <div className="p-2.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
        <div className="space-y-1 relative z-10">
          <div className="inline-block">
            <Badge variant="outline" className={`text-xs font-black uppercase px-3 py-0.5 rounded-md ${overallStatus.color}`}>
              {overallStatus.label}
            </Badge>
          </div>
          <p className="text-[10px] text-muted-foreground font-semibold leading-normal mt-1">
            {overallStatus.desc}
          </p>
        </div>
      </div>

      {/* Card 4: Containers Summary */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4 hover:border-primary/20 transition-all duration-300 relative group overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl -mr-6 -mt-6 group-hover:bg-purple-500/10 transition-colors" />
        
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            Containers List ({result.containers.length})
          </span>
          <div className="p-2.5 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-xl">
            <Container className="w-5 h-5" />
          </div>
        </div>
        <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto pr-1 relative z-10">
          {result.containers.map((c) => (
            <Badge 
              key={c.containerNo} 
              variant="secondary" 
              className="text-[9px] font-mono font-bold py-0.5 bg-muted border border-border/80 hover:bg-muted"
            >
              {c.containerNo}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}
