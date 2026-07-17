"use client";

import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { ShipmentFormValues, shipmentSchema } from "@/lib/validator";
import { createShipmentAction } from "@/actions/shipment-action";
import { Button } from "@/components/ui/button";
import { useProgress } from "@bprogress/next";

// Import subcomponents
import { LogisticsSection } from "./components/LogisticsSection";
import { EntitiesSection } from "./components/EntitiesSection";
import { VesselRouteSection } from "./components/VesselRouteSection";
import { SchedulesSection } from "./components/SchedulesSection";
import { LivePreviewCard } from "./components/LivePreviewCard";

export function ShipmentForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { start: startProgress, stop: stopProgress } = useProgress();
  const [errMessage, setErrMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm<ShipmentFormValues>({
    resolver: zodResolver(shipmentSchema),
    defaultValues: {
      type: "IMPORT",
      jobNo: "",
      blNo: "",
      shipper: "",
      consignee: "",
      vessel: "",
      portOfLoading: "",
      portOfDischarge: "",
    }
  });

  const watchedValues = useWatch({ control });

  const onSubmit = (values: ShipmentFormValues) => {
    setErrMessage(null);
    startProgress();
    startTransition(async () => {
      try {
        const res = await createShipmentAction(values);
        if (res.success) {
          router.push("/shipments");
        } else {
          setErrMessage(res.error || "An operations ingestion error occurred.");
        }
      } finally {
        stopProgress();
      }
    });
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start w-full"
    >
      {errMessage && (
        <div className="lg:col-span-12 p-4 bg-destructive/10 border border-destructive/30 text-destructive rounded-2xl text-sm font-medium">
          {errMessage}
        </div>
      )}

      {/* Left Column: Form Sections (Stacked on mobile, 8-cols on large screens) */}
      <div className="lg:col-span-7 xl:col-span-8 space-y-6 w-full">
        <LogisticsSection register={register} errors={errors} setValue={setValue} typeValue={watchedValues.type || "IMPORT"} />
        
        <EntitiesSection register={register} errors={errors} />
        
        <VesselRouteSection register={register} errors={errors} />
        
        <SchedulesSection errors={errors} setValue={setValue} />

        {/* Action Buttons */}
        <div className="pt-4 flex items-center justify-end gap-3 w-full">
          <Link
            href="/shipments"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground font-semibold px-4 py-2.5 border border-border rounded-xl hover:bg-muted/70 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Cancel
          </Link>
          <Button
            type="submit"
            disabled={isPending}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-6 py-2.5 rounded-xl shadow-sm transition-colors flex items-center gap-2"
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Ingesting...
              </>
            ) : (
              "Initialize Tracker Pipeline"
            )}
          </Button>
        </div>
      </div>

      {/* Right Column: Live Sticky Preview Card (Stacked on mobile, sticky on large screens) */}
      <div className="lg:col-span-5 xl:col-span-4 lg:sticky lg:top-6 space-y-6 w-full">
        <LivePreviewCard
          jobNo={watchedValues.jobNo}
          blNo={watchedValues.blNo}
          shipper={watchedValues.shipper}
          consignee={watchedValues.consignee}
          vessel={watchedValues.vessel}
          portOfLoading={watchedValues.portOfLoading}
          portOfDischarge={watchedValues.portOfDischarge}
          etd={watchedValues.etd}
          eta={watchedValues.eta}
          etb={watchedValues.etb}
          openCy={watchedValues.openCy}
          closeSi={watchedValues.closeSi}
          closeCy={watchedValues.closeCy}
        />
      </div>
    </form>
  );
}
