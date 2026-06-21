import { UseFormRegister, FieldErrors } from "react-hook-form";
import { Ship } from "lucide-react";
import { ShipmentFormValues } from "@/lib/validator";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface VesselRouteSectionProps {
  register: UseFormRegister<ShipmentFormValues>;
  errors: FieldErrors<ShipmentFormValues>;
}

export function VesselRouteSection({ register, errors }: VesselRouteSectionProps) {
  return (
    <div className="bg-card border border-border rounded-2xl p-6 shadow-xs space-y-4 hover:border-border/80 transition-colors">
      <div className="flex items-center gap-2 border-b border-border pb-3">
        <Ship className="w-4 h-4 text-primary" />
        <h2 className="text-sm font-black text-foreground uppercase tracking-wide">
          Vessel & Transit Routing
        </h2>
      </div>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="vessel">Vessel / Voyage Reference</Label>
          <Input
            id="vessel"
            {...register("vessel")}
            placeholder="COSCO SHIPPING ALPS V.045E"
            className="bg-muted/30 border-border/60"
          />
          {errors.vessel && (
            <p className="text-xs text-destructive font-semibold mt-0.5">
              {errors.vessel.message}
            </p>
          )}
        </div>

        <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="portOfLoading">Port Of Loading (POL)</Label>
            <Input
              id="portOfLoading"
              {...register("portOfLoading")}
              placeholder="Shanghai (CNSHA)"
              className="bg-muted/30 border-border/60"
            />
            {errors.portOfLoading && (
              <p className="text-xs text-destructive font-semibold mt-0.5">
                {errors.portOfLoading.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="portOfDischarge">Port Of Discharge (POD)</Label>
            <Input
              id="portOfDischarge"
              {...register("portOfDischarge")}
              placeholder="Tanjung Priok (IDTPK)"
              className="bg-muted/30 border-border/60"
            />
            {errors.portOfDischarge && (
              <p className="text-xs text-destructive font-semibold mt-0.5">
                {errors.portOfDischarge.message}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
