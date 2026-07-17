"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pencil } from "lucide-react";
import { updateShipmentDatesSchema, UpdateShipmentDatesValues } from "@/lib/validator";
import { updateShipmentDatesAction } from "@/actions/shipment-action";
import { ShipmentWithRelations } from "@/lib";

function formatDateForInput(dateVal: Date | string | null | undefined, includeTime = false) {
  if (!dateVal) return "";
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return "";
    return format(d, includeTime ? "yyyy-MM-dd'T'HH:mm" : "yyyy-MM-dd");
  } catch {
    return "";
  }
}

export function EditShipmentModal({ shipment }: { shipment: ShipmentWithRelations }) {
  const [open, setOpen] = useState(false);
  const isExport = shipment.type === "EXPORT";

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<UpdateShipmentDatesValues>({
    resolver: zodResolver(updateShipmentDatesSchema),
    defaultValues: {
      eta: formatDateForInput(shipment.eta, false),
      etd: formatDateForInput(shipment.etd, false),
      openCy: formatDateForInput(shipment.openCy, true),
      closeSi: formatDateForInput(shipment.closeSi, true),
      closeCy: formatDateForInput(shipment.closeCy, true),
    },
  });

  const onSubmit = async (data: UpdateShipmentDatesValues) => {
    const res = await updateShipmentDatesAction(shipment.id, data);
    if (res.success) {
      setOpen(false);
    } else {
      alert("Failed to update: " + res.error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 px-3 gap-1.5 text-xs font-bold border-border bg-card shadow-sm hover:bg-muted/50 rounded-lg">
          <Pencil className="w-3.5 h-3.5 text-primary" /> Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] rounded-2xl p-6">
        <DialogHeader>
          <DialogTitle className="text-lg font-black tracking-tight text-foreground flex gap-2 items-center">
            <Pencil className="w-5 h-5 text-primary" /> Edit {isExport ? "Export Schedules" : "ETA"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 mt-2">
          {!isExport ? (
            <div className="space-y-1.5">
              <Label htmlFor="eta">ETA Arrival Date</Label>
              <Input id="eta" type="date" {...register("eta")} className="bg-muted/30" />
              {errors.eta && <p className="text-xs text-destructive">{errors.eta.message as string}</p>}
            </div>
          ) : (
            <div className="grid gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="etd">ETD Departure Date</Label>
                <Input id="etd" type="date" {...register("etd")} className="bg-muted/30" />
                {errors.etd && <p className="text-xs text-destructive">{errors.etd.message as string}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="openCy">Open CY</Label>
                <Input id="openCy" type="datetime-local" {...register("openCy")} className="bg-muted/30" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="closeSi">Close SI</Label>
                <Input id="closeSi" type="datetime-local" {...register("closeSi")} className="bg-muted/30" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="closeCy">Close CY</Label>
                <Input id="closeCy" type="datetime-local" {...register("closeCy")} className="bg-muted/30" />
              </div>
            </div>
          )}
          
          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={isSubmitting} className="font-bold tracking-wide rounded-xl">
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
