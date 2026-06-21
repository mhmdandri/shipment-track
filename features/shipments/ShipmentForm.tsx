"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { ShipmentFormValues, shipmentSchema } from "@/lib/validator";
import { createShipmentAction } from "@/actions/shipment-action";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function ShipmentForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errMessage, setErrMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ShipmentFormValues>({
    resolver: zodResolver(shipmentSchema),
  });

  const onSubmit = (values: ShipmentFormValues) => {
    setErrMessage(null);
    startTransition(async () => {
      const res = await createShipmentAction(values);
      if (res.success) {
        router.push("/shipments");
      } else {
        setErrMessage(res.error || "An operations ingestion error occurred.");
      }
    });
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-8 bg-card p-4 lg:p-8 rounded-2xl border border-border shadow-sm max-w-4xl mx-auto"
    >
      {errMessage && (
        <div className="p-4 bg-destructive/10 border border-destructive/30 text-destructive rounded-lg text-sm font-medium">
          {errMessage}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="jobNo">Job Number</Label>
          <Input
            id="jobNo"
            {...register("jobNo")}
            placeholder="e.g., JID20260001"
          />
          {errors.jobNo && (
            <p className="text-xs text-destructive font-medium">
              {errors.jobNo.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="blNo">B/L or AWB Number</Label>
          <Input
            id="blNo"
            {...register("blNo")}
            placeholder="e.g., COSU612345678"
          />
          {errors.blNo && (
            <p className="text-xs text-destructive font-medium">
              {errors.blNo.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="shipper">Shipper Corporate Name</Label>
          <Input
            id="shipper"
            {...register("shipper")}
            placeholder="Global Export Logistics Corp"
          />
          {errors.shipper && (
            <p className="text-xs text-destructive font-medium">
              {errors.shipper.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="consignee">Consignee Corporate Name</Label>
          <Input
            id="consignee"
            {...register("consignee")}
            placeholder="Local Distribution Imports Pt"
          />
          {errors.consignee && (
            <p className="text-xs text-destructive font-medium">
              {errors.consignee.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="vessel">Vessel / Voyage Reference</Label>
          <Input
            id="vessel"
            {...register("vessel")}
            placeholder="COSCO SHIPPING ALPS V.045E"
          />
          {errors.vessel && (
            <p className="text-xs text-destructive font-medium">
              {errors.vessel.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="portOfLoading">Port Of Loading (POL)</Label>
          <Input
            id="portOfLoading"
            {...register("portOfLoading")}
            placeholder="Shanghai (CNSHA)"
          />
          {errors.portOfLoading && (
            <p className="text-xs text-destructive font-medium">
              {errors.portOfLoading.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="portOfDischarge">Port Of Discharge (POD)</Label>
          <Input
            id="portOfDischarge"
            {...register("portOfDischarge")}
            placeholder="Tanjung Priok (IDTPK)"
          />
          {errors.portOfDischarge && (
            <p className="text-xs text-destructive font-medium">
              {errors.portOfDischarge.message}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="etd">ETD</Label>
            <Input
              id="etd"
              type="date"
              onChange={(e) =>
                setValue(
                  "etd",
                  e.target.value ? new Date(e.target.value) : new Date(),
                )
              }
            />
            {errors.etd && (
              <p className="text-xs text-destructive font-medium">
                {errors.etd.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="eta">ETA</Label>
            <Input
              id="eta"
              type="date"
              onChange={(e) =>
                setValue(
                  "eta",
                  e.target.value ? new Date(e.target.value) : new Date(),
                )
              }
            />
            {errors.eta && (
              <p className="text-xs text-destructive font-medium">
                {errors.eta.message}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-border flex items-center justify-end gap-3">
        <Link
          href="/shipments"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground font-medium px-4 py-2 border border-border rounded-xl hover:bg-muted transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Cancel
        </Link>
        <Button
          type="submit"
          disabled={isPending}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium px-6 rounded-xl shadow-md transition-colors"
        >
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Provisioning...
            </>
          ) : (
            "Initialize Tracker Pipeline"
          )}
        </Button>
      </div>
    </form>
  );
}
