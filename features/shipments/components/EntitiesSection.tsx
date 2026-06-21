import { UseFormRegister, FieldErrors } from "react-hook-form";
import { Building2 } from "lucide-react";
import { ShipmentFormValues } from "@/lib/validator";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface EntitiesSectionProps {
  register: UseFormRegister<ShipmentFormValues>;
  errors: FieldErrors<ShipmentFormValues>;
}

export function EntitiesSection({ register, errors }: EntitiesSectionProps) {
  return (
    <div className="bg-card border border-border rounded-2xl p-6 shadow-xs space-y-4 hover:border-border/80 transition-colors">
      <div className="flex items-center gap-2 border-b border-border pb-3">
        <Building2 className="w-4 h-4 text-primary" />
        <h2 className="text-sm font-black text-foreground uppercase tracking-wide">
          Corporate Entities
        </h2>
      </div>
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="shipper">Shipper Corporate Name</Label>
          <Input
            id="shipper"
            {...register("shipper")}
            placeholder="Global Export Logistics Corp"
            className="bg-muted/30 border-border/60"
          />
          {errors.shipper && (
            <p className="text-xs text-destructive font-semibold mt-0.5">
              {errors.shipper.message}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="consignee">Consignee Corporate Name</Label>
          <Input
            id="consignee"
            {...register("consignee")}
            placeholder="Local Distribution Imports Pt"
            className="bg-muted/30 border-border/60"
          />
          {errors.consignee && (
            <p className="text-xs text-destructive font-semibold mt-0.5">
              {errors.consignee.message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
