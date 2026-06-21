"use client";

import { useTransition } from "react";
import { CheckCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toggleReminderAction } from "@/actions/shipment-action";
import { useProgress } from "@bprogress/next";

interface ResolveReminderButtonProps {
  reminderId: string;
  shipmentId: string;
}

export function ResolveReminderButton({
  reminderId,
  shipmentId,
}: ResolveReminderButtonProps) {
  const [isPending, startTransition] = useTransition();
  const { start, stop } = useProgress();

  const handleResolve = () => {
    start();
    startTransition(async () => {
      try {
        await toggleReminderAction(reminderId, true, shipmentId);
      } finally {
        stop();
      }
    });
  };

  return (
    <Button
      variant="outline"
      size="xs"
      onClick={handleResolve}
      disabled={isPending}
      title="Mark as Resolved"
    >
      {isPending ? (
        <Loader2 className="animate-spin" />
      ) : (
        <CheckCheck />
      )}
      {isPending ? "Saving…" : "Resolve"}
    </Button>
  );
}
