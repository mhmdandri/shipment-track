import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ArrowUpRight } from "lucide-react";
import { ResolveReminderButton } from "./ResolveReminderButton";

// Semua warna menggunakan token semantik Shadcn — tidak ada hard-coded color classes
const priorityVariants: Record<string, string> = {
  LOW: "bg-muted text-muted-foreground border-border",
  MEDIUM: "bg-secondary text-secondary-foreground border-border",
  HIGH: "bg-accent text-accent-foreground border-border",
  URGENT: "bg-destructive/10 text-destructive border-destructive/30 animate-pulse",
};

export function ReminderCard({ item }: { item: any }) {
  return (
    <div className="p-4 bg-card border border-border rounded-xl shadow-sm hover:shadow-md transition-all flex flex-col gap-3">
      {/* Header row: title + priority badge */}
      <div className="flex items-start justify-between gap-2">
        <span className="font-semibold text-foreground text-sm leading-tight">
          {item.title}
        </span>
        <Badge
          variant="outline"
          className={`text-[10px] font-bold px-2 py-0.5 uppercase shrink-0 ${priorityVariants[item.priority]}`}
        >
          {item.priority}
        </Badge>
      </div>

      {/* Job & consignee info */}
      <p className="text-xs font-medium text-muted-foreground -mt-1">
        Job:{" "}
        <span className="font-bold text-foreground">{item.shipment.jobNo}</span>{" "}
        ({item.shipment.consignee})
      </p>

      {/* Due / ETA dates */}
      <div className="flex items-center justify-between text-[11px] text-muted-foreground font-medium">
        <span>Due: {format(new Date(item.dueDate), "dd MMM yyyy")}</span>
        <span>ETA: {format(new Date(item.shipment.eta), "dd MMM yyyy")}</span>
      </div>

      {/* Action row: Resolve button + View detail link */}
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-border">
        <ResolveReminderButton
          reminderId={item.id}
          shipmentId={item.shipment.id}
        />
        <Button variant="ghost" size="xs" asChild>
          <Link
            href={`/shipments/${item.shipment.id}`}
            title="View shipment detail"
          >
            View Detail
            <ArrowUpRight />
          </Link>
        </Button>
      </div>
    </div>
  );
}
