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
    <Card className="border border-slate-200 shadow-sm rounded-2xl bg-white overflow-hidden">
      <CardHeader className="bg-slate-50 border-b border-slate-100 p-4">
        <CardTitle className="text-sm font-bold text-slate-800 tracking-wide uppercase flex items-center gap-2">
          <Ship className="w-4 h-4 text-cyan-600" /> Shipping Manifest Logistics
          Core
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1.5 border-l-2 border-cyan-500 pl-3">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Job Identification
          </span>
          <span className="text-base font-bold text-slate-900 block">
            {shipment.jobNo}
          </span>
          <span className="text-xs text-slate-500 block font-mono">
            B/L: {shipment.blNo}
          </span>
        </div>
        <div className="space-y-1.5 border-l-2 border-purple-500 pl-3">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Corporate Entities
          </span>
          <span className="text-sm font-semibold text-slate-900 block truncate">
            Consignee: {shipment.consignee}
          </span>
          <span className="text-xs text-slate-500 block truncate">
            Shipper: {shipment.shipper}
          </span>
        </div>
        <div className="space-y-1.5 border-l-2 border-amber-500 pl-3">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Vessel & Transit Routing
          </span>
          <span className="text-sm font-semibold text-slate-900 block truncate">
            {shipment.vessel}
          </span>
          <span className="text-xs text-slate-500 flex items-center gap-1.5 truncate mt-0.5">
            {shipment.portOfLoading}{" "}
            <ArrowRight className="w-3 h-3 text-slate-400" />{" "}
            {shipment.portOfDischarge}
          </span>
        </div>
        <div className="space-y-1.5 border-l-2 border-emerald-500 pl-3">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Target Schedules
          </span>
          <span className="text-sm font-semibold text-slate-900 block">
            ETA: {format(new Date(shipment.eta), "dd MMM yyyy")}
          </span>
          <span className="text-xs text-slate-500 block">
            ETD: {format(new Date(shipment.etd), "dd MMM yyyy")}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
