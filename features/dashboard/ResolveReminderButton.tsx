"use client";

import { useTransition } from "react";
import { CheckCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toggleReminderAction } from "@/actions/shipment-action";

interface ResolveReminderButtonProps {
  reminderId: string;
  shipmentId: string;
}

export function ResolveReminderButton({
  reminderId,
  shipmentId,
}: ResolveReminderButtonProps) {
  const [isPending, startTransition] = useTransition();

  const handleResolve = () => {
    startTransition(async () => {
      await toggleReminderAction(reminderId, true, shipmentId);
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
