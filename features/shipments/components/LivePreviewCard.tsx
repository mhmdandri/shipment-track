import { Ship, Sparkles, MapPin, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";

interface LivePreviewCardProps {
  jobNo?: string;
  blNo?: string;
  shipper?: string;
  consignee?: string;
  vessel?: string;
  portOfLoading?: string;
  portOfDischarge?: string;
  etd?: Date | string | null;
  eta?: Date | string | null;
  etb?: Date | string | null;
  openCy?: Date | string | null;
  closeSi?: Date | string | null;
  closeCy?: Date | string | null;
}

export function LivePreviewCard({
  jobNo = "",
  blNo = "",
  shipper = "",
  consignee = "",
  vessel = "",
  portOfLoading = "",
  portOfDischarge = "",
  etd,
  eta,
  etb,
  openCy,
  closeSi,
  closeCy,
}: LivePreviewCardProps) {
  const formatDate = (dateVal: Date | string | null | undefined, includeTime = false): string => {
    if (!dateVal) return "";
    try {
      const d = dateVal instanceof Date ? dateVal : new Date(dateVal);
      if (isNaN(d.getTime())) return "";
      return format(d, includeTime ? "dd MMM yyyy HH:mm" : "dd MMM yyyy");
    } catch {
      return "";
    }
  };

  const getTransitDays = (): number | null => {
    if (!etd || !eta) return null;
    try {
      const d1 = etd instanceof Date ? etd : new Date(etd);
      const d2 = eta instanceof Date ? eta : new Date(eta);
      if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return null;
      const diffTime = d2.getTime() - d1.getTime();
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    } catch {
      return null;
    }
  };

  const transitDays = getTransitDays();

  return (
    <div className="bg-card border border-border rounded-2xl p-6 shadow-xs space-y-5 hover:border-border/80 transition-colors">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
          <h3 className="font-bold text-foreground text-sm tracking-wide">
            Live Manifest Preview
          </h3>
        </div>
        <span className="text-[9px] font-black text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
          Draft
        </span>
      </div>

      {/* Job and B/L Info */}
      <div className="space-y-1">
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
          Job Identification
        </span>
        <div className="text-lg font-black text-foreground tracking-tight truncate">
          {jobNo || (
            <span className="text-muted-foreground/30 font-normal italic text-sm">
              Waiting for Job No...
            </span>
          )}
        </div>
        <div className="text-xs text-muted-foreground font-medium flex items-center gap-1.5 truncate mt-0.5">
          <span className="font-mono bg-muted border border-border/50 text-[10px] px-1.5 py-0.5 rounded">
            B/L AWB
          </span>
          <span>
            {blNo || (
              <span className="text-muted-foreground/30 font-normal italic">
                Waiting for BL...
              </span>
            )}
          </span>
        </div>
      </div>

      {/* Route Pipeline */}
      <div className="bg-muted/30 border border-border/40 rounded-xl p-4 space-y-4">
        <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground">
          <span>Transit Route Pipeline</span>
          {transitDays !== null ? (
            transitDays >= 0 ? (
              <span className="text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                {transitDays} Days Transit
              </span>
            ) : (
              <span className="text-destructive bg-destructive/10 px-2 py-0.5 rounded-full font-black">
                Invalid Schedule
              </span>
            )
          ) : (
            <span className="italic text-muted-foreground/50 font-normal">
              Dates pending
            </span>
          )}
        </div>
        
        <div className="relative flex items-center justify-between py-2">
          <div className="absolute left-6 right-6 h-0.5 border-t-2 border-dashed border-border" />
          
          {/* Origin Port */}
          <div className="relative z-10 flex flex-col items-center">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center border transition-all ${portOfLoading ? 'bg-primary border-primary text-primary-foreground shadow-sm' : 'bg-card border-border text-muted-foreground/50'}`}>
              <MapPin className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold text-foreground mt-2 max-w-21.25 text-center truncate block">
              {portOfLoading || "Origin Port"}
            </span>
            <span className="text-[9px] text-muted-foreground font-medium block">
              {formatDate(etd) || "ETD"}
            </span>
          </div>

          {/* Transit Icon */}
          <div className="relative z-10">
            <Ship className={`w-5 h-5 transition-colors ${portOfLoading && portOfDischarge ? 'text-primary' : 'text-muted-foreground/30'}`} />
          </div>

          {/* Destination Port */}
          <div className="relative z-10 flex flex-col items-center">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center border transition-all ${portOfDischarge ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm' : 'bg-card border-border text-muted-foreground/50'}`}>
              <MapPin className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold text-foreground mt-2 max-w-21.25 text-center truncate block">
              {portOfDischarge || "Destination Port"}
            </span>
            <span className="text-[9px] text-muted-foreground font-medium block">
              {formatDate(eta) || "ETA"}
            </span>
          </div>
        </div>
      </div>

      {/* Details list */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs border-t border-border pt-4">
        <div className="space-y-0.5">
          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">
            Carrier Vessel
          </span>
          <span className="font-bold text-foreground truncate block">
            {vessel || (
              <span className="text-muted-foreground/30 font-normal italic">—</span>
            )}
          </span>
        </div>
        
        <div className="space-y-0.5">
          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">
            Shipper Corp
          </span>
          <span className="font-bold text-foreground truncate block">
            {shipper || (
              <span className="text-muted-foreground/30 font-normal italic">—</span>
            )}
          </span>
        </div>

        <div className="col-span-2 space-y-0.5">
          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">
            Consignee Corp
          </span>
          <span className="font-bold text-foreground truncate block">
            {consignee || (
              <span className="text-muted-foreground/30 font-normal italic">—</span>
            )}
          </span>
        </div>
      </div>

      {/* Export Schedule Summary */}
      {(openCy || closeSi || closeCy || etb) && (
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs border-t border-border pt-4">
          <div className="col-span-2 space-y-0.5">
            <span className="text-[9px] font-bold text-orange-500 uppercase tracking-wider block">
              Export Schedules
            </span>
          </div>
          {etb && (
            <div className="space-y-0.5">
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">
                ETB
              </span>
              <span className="font-bold text-foreground truncate block">
                {formatDate(etb)}
              </span>
            </div>
          )}
          {openCy && (
            <div className="space-y-0.5">
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">
                Open CY
              </span>
              <span className="font-bold text-foreground truncate block">
                {formatDate(openCy, true)}
              </span>
            </div>
          )}
          {closeSi && (
            <div className="space-y-0.5">
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">
                Close SI
              </span>
              <span className="font-bold text-foreground truncate block">
                {formatDate(closeSi, true)}
              </span>
            </div>
          )}
          {closeCy && (
            <div className="space-y-0.5">
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">
                Close CY
              </span>
              <span className="font-bold text-foreground truncate block">
                {formatDate(closeCy, true)}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Automated Ingestions Checklist */}
      <div className="border-t border-border pt-4 space-y-2.5">
        <span className="text-[9px] font-black text-muted-foreground uppercase tracking-wider block">
          Automated Ingestions
        </span>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold">
            <CheckCircle2 className={`w-4 h-4 transition-all duration-300 ${jobNo && blNo ? 'text-emerald-500 fill-emerald-500/10' : 'text-muted-foreground/20'}`} />
            <span className={jobNo && blNo ? 'text-foreground' : 'text-muted-foreground/50 font-normal'}>
              Logistics File Ingested
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold">
            <CheckCircle2 className={`w-4 h-4 transition-all duration-300 ${etd ? 'text-emerald-500 fill-emerald-500/10' : 'text-muted-foreground/20'}`} />
            <span className={etd ? 'text-foreground' : 'text-muted-foreground/50 font-normal'}>
              ETD Departure Pipeline
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold">
            <CheckCircle2 className={`w-4 h-4 transition-all duration-300 ${vessel ? 'text-emerald-500 fill-emerald-500/10' : 'text-muted-foreground/20'}`} />
            <span className={vessel ? 'text-foreground' : 'text-muted-foreground/50 font-normal'}>
              Vessel Milestones Tracker
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold">
            <CheckCircle2 className={`w-4 h-4 transition-all duration-300 ${eta ? 'text-emerald-500 fill-emerald-500/10' : 'text-muted-foreground/20'}`} />
            <span className={eta ? 'text-foreground' : 'text-muted-foreground/50 font-normal'}>
              ETA Destination Alerts
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
