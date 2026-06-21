import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShipmentWithRelations } from "@/lib";
import { format } from "date-fns";
import { Ship, ArrowRight } from "lucide-react";

export function ShipmentInfoCard({
  shipment,
}: {
  shipment: ShipmentWithRelations;
}) {
  return (
    <Card className="border border-border shadow-sm rounded-2xl bg-card overflow-hidden">
      <CardHeader className="bg-muted border-b border-border p-4">
        <CardTitle className="text-sm font-bold text-foreground tracking-wide uppercase flex items-center gap-2">
          <Ship className="w-4 h-4 text-primary" /> Shipping Manifest Logistics
          Core
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 lg:p-6 grid gap-4 grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1.5 border-l-2 border-blue-500 pl-3">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
            Job Identification
          </span>
          <span className="text-base font-bold text-foreground block">
            {shipment.jobNo}
          </span>
          <span className="text-xs text-muted-foreground block font-mono">
            B/L: {shipment.blNo}
          </span>
        </div>
        <div className="space-y-1.5 border-l-2 border-purple-500 pl-3">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
            Corporate Entities
          </span>
          <span className="text-sm font-semibold text-foreground block truncate">
            Consignee: {shipment.consignee}
          </span>
          <span className="text-xs text-muted-foreground block truncate">
            Shipper: {shipment.shipper}
          </span>
        </div>
        <div className="space-y-1.5 border-l-2 border-amber-500 pl-3">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
            Vessel & Transit Routing
          </span>
          <span className="text-sm font-semibold text-foreground block truncate">
            {shipment.vessel}
          </span>
          <span className="text-xs text-muted-foreground flex items-center gap-1.5 truncate mt-0.5">
            {shipment.portOfLoading}{" "}
            <ArrowRight className="w-3 h-3 text-muted-foreground" />{" "}
            {shipment.portOfDischarge}
          </span>
        </div>
        <div className="space-y-1.5 border-l-2 border-emerald-500 pl-3">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
            Target Schedules
          </span>
          <span className="text-sm font-semibold text-foreground block">
            ETA: {format(new Date(shipment.eta), "dd MMM yyyy")}
          </span>
          <span className="text-xs text-muted-foreground block">
            ETD: {format(new Date(shipment.etd), "dd MMM yyyy")}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
