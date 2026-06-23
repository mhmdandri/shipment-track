"use client";

import { Ship, Container } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { UnifiedTrackingResult } from "@/actions/track-action";

interface ShipmentHeaderCardProps {
  result: UnifiedTrackingResult;
}

export function ShipmentHeaderCard({ result }: ShipmentHeaderCardProps) {
  return (
    <div className="bg-card border border-border rounded-3xl p-6 lg:p-8 shadow-md overflow-hidden relative group transition-all duration-300 hover:shadow-lg">
      {/* Border Accent Gradient */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-linear-to-r from-blue-500 via-indigo-500 to-primary" />
      
      {/* Ticket Side Cuts (CSS decoration) */}
      <div className="absolute -left-2.5 top-1/2 -translate-y-1/2 w-5 h-8 bg-background border-r border-border rounded-r-full hidden md:block" />
      <div className="absolute -right-2.5 top-1/2 -translate-y-1/2 w-5 h-8 bg-background border-l border-border rounded-l-full hidden md:block" />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative">
        <div className="space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-xs px-3 py-1 font-bold uppercase tracking-wider rounded-lg">
              {result.carrier} Line
            </Badge>
            {result.blNo && (
              <span className="text-xs font-mono text-muted-foreground bg-muted/60 px-2.5 py-1 rounded-lg border border-border font-semibold">
                BL Ref: {result.blNo}
              </span>
            )}
          </div>
          <h2 className="text-2xl md:text-3xl font-black tracking-tight text-foreground flex items-center gap-2 font-mono">
            <Ship className="w-7 h-7 text-primary" />
            {result.bookingNo}
          </h2>
          {result.vesselName && (
            <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground flex-wrap">
              <span className="text-foreground bg-secondary/80 px-2.5 py-1 rounded-md border border-border">Vessel</span>
              <span className="text-foreground/90 font-mono text-sm">{result.vesselName}</span>
              {result.voyageNo && (
                <span className="bg-muted px-2 py-0.5 rounded text-xs border border-border/80">Voyage {result.voyageNo}</span>
              )}
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-4 text-xs font-mono bg-muted/80 border border-border p-4 rounded-2xl shadow-xs">
          <div>
            <span className="text-muted-foreground block uppercase text-[9px] tracking-widest font-extrabold mb-1">Manifest Load</span>
            <span className="text-lg text-foreground font-black flex items-center gap-1">
              <Container className="w-5 h-5 text-primary/80" /> {result.containers.length} Containers
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
