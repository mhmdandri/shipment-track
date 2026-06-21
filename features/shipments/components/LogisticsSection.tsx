import { UseFormRegister, FieldErrors } from "react-hook-form";
import { FileText } from "lucide-react";
import { ShipmentFormValues } from "@/lib/validator";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface LogisticsSectionProps {
  register: UseFormRegister<ShipmentFormValues>;
  errors: FieldErrors<ShipmentFormValues>;
}

export function LogisticsSection({ register, errors }: LogisticsSectionProps) {
  return (
    <div className="bg-card border border-border rounded-2xl p-6 shadow-xs space-y-4 hover:border-border/80 transition-colors">
      <div className="flex items-center gap-2 border-b border-border pb-3">
        <FileText className="w-4 h-4 text-primary" />
        <h2 className="text-sm font-black text-foreground uppercase tracking-wide">
          Logistics Reference
        </h2>
      </div>
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="jobNo">Job Number</Label>
          <Input
            id="jobNo"
            {...register("jobNo")}
            placeholder="e.g., JID20260001"
            className="bg-muted/30 border-border/60"
          />
          {errors.jobNo && (
            <p className="text-xs text-destructive font-semibold mt-0.5">
              {errors.jobNo.message}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="blNo">B/L or AWB Number</Label>
          <Input
            id="blNo"
            {...register("blNo")}
            placeholder="e.g., COSU612345678"
            className="bg-muted/30 border-border/60"
          />
          {errors.blNo && (
            <p className="text-xs text-destructive font-semibold mt-0.5">
              {errors.blNo.message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
