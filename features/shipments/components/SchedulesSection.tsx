import { FieldErrors, UseFormSetValue } from "react-hook-form";
import { CalendarDays } from "lucide-react";
import { ShipmentFormValues } from "@/lib/validator";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface SchedulesSectionProps {
  errors: FieldErrors<ShipmentFormValues>;
  setValue: UseFormSetValue<ShipmentFormValues>;
}

export function SchedulesSection({ errors, setValue }: SchedulesSectionProps) {
  return (
    <div className="bg-card border border-border rounded-2xl p-6 shadow-xs space-y-4 hover:border-border/80 transition-colors">
      <div className="flex items-center gap-2 border-b border-border pb-3">
        <CalendarDays className="w-4 h-4 text-primary" />
        <h2 className="text-sm font-black text-foreground uppercase tracking-wide">
          Target Schedules
        </h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="etd">ETD</Label>
          <Input
            id="etd"
            type="date"
            onChange={(e) =>
              setValue(
                "etd",
                e.target.value ? new Date(e.target.value) : new Date(),
                { shouldValidate: true }
              )
            }
            className="bg-muted/30 border-border/60 block w-full text-foreground"
          />
          {errors.etd && (
            <p className="text-xs text-destructive font-semibold mt-0.5">
              {errors.etd.message}
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="eta">ETA</Label>
          <Input
            id="eta"
            type="date"
            onChange={(e) =>
              setValue(
                "eta",
                e.target.value ? new Date(e.target.value) : new Date(),
                { shouldValidate: true }
              )
            }
            className="bg-muted/30 border-border/60 block w-full text-foreground"
          />
          {errors.eta && (
            <p className="text-xs text-destructive font-semibold mt-0.5">
              {errors.eta.message}
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="etb">ETB (Berthing)</Label>
          <Input
            id="etb"
            type="date"
            onChange={(e) =>
              setValue(
                "etb",
                e.target.value ? new Date(e.target.value) : null,
                { shouldValidate: true }
              )
            }
            className="bg-muted/30 border-border/60 block w-full text-foreground"
          />
          {errors.etb && (
            <p className="text-xs text-destructive font-semibold mt-0.5">
              {errors.etb.message}
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="openCy">Open CY</Label>
          <Input
            id="openCy"
            type="datetime-local"
            onChange={(e) =>
              setValue(
                "openCy",
                e.target.value ? new Date(e.target.value) : null,
                { shouldValidate: true }
              )
            }
            className="bg-muted/30 border-border/60 block w-full text-foreground"
          />
          {errors.openCy && (
            <p className="text-xs text-destructive font-semibold mt-0.5">
              {errors.openCy.message}
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="closeSi">Close SI</Label>
          <Input
            id="closeSi"
            type="datetime-local"
            onChange={(e) =>
              setValue(
                "closeSi",
                e.target.value ? new Date(e.target.value) : null,
                { shouldValidate: true }
              )
            }
            className="bg-muted/30 border-border/60 block w-full text-foreground"
          />
          {errors.closeSi && (
            <p className="text-xs text-destructive font-semibold mt-0.5">
              {errors.closeSi.message}
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="closeCy">Close CY</Label>
          <Input
            id="closeCy"
            type="datetime-local"
            onChange={(e) =>
              setValue(
                "closeCy",
                e.target.value ? new Date(e.target.value) : null,
                { shouldValidate: true }
              )
            }
            className="bg-muted/30 border-border/60 block w-full text-foreground"
          />
          {errors.closeCy && (
            <p className="text-xs text-destructive font-semibold mt-0.5">
              {errors.closeCy.message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
