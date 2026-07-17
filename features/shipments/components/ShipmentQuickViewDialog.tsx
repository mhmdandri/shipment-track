"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ArrowRight, Loader2, ListTodo, History, Ship } from "lucide-react";
import Link from "next/link";
import { getShipmentQuickViewAction } from "@/actions/shipment-action";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

import { Shipment, ActivityLog, Todo } from "@/app/generated/prisma/client";

type QuickViewData = Shipment & {
  activityLogs: ActivityLog[];
  todos: Todo[];
};

export function ShipmentQuickViewDialog({
  shipmentId,
  open,
  onOpenChange,
}: {
  shipmentId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [data, setData] = useState<QuickViewData | null>(null);

  useEffect(() => {
    let active = true;
    if (open && shipmentId) {
      getShipmentQuickViewAction(shipmentId).then((res) => {
        if (active && res.success && res.data) {
          // Cast data as unknown then QuickViewData since it returns a generic object structure
          setData(res.data as unknown as QuickViewData);
        }
      });
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setData(null);
    }
    return () => {
      active = false;
    };
  }, [open, shipmentId]);

  const isLoading = !data || data.id !== shipmentId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[450px] rounded-2xl p-0 overflow-hidden bg-card"
        aria-describedby="quick-view-description"
      >
        <DialogDescription id="quick-view-description" className="sr-only">
          Quick view of shipment summary, latest activity, and pending todos.
        </DialogDescription>
        {isLoading ? (
          <div className="p-8 flex justify-center items-center h-[300px]">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <DialogHeader className="bg-muted p-5 pr-12 border-b border-border">
              <div className="flex items-start justify-between">
                <div>
                  <DialogTitle className="text-xl font-black tracking-tight text-foreground flex items-center gap-2">
                    <Ship className="w-5 h-5 text-primary" /> {data.jobNo}
                  </DialogTitle>
                  <p className="text-xs text-muted-foreground font-mono mt-1">
                    B/L: {data.blNo}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                    data.status === "ACTIVE"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : data.status === "COMPLETED"
                        ? "bg-muted text-muted-foreground border-border"
                        : "bg-secondary text-secondary-foreground border-border"
                  }`}
                >
                  {data.status}
                </Badge>
              </div>
            </DialogHeader>

            <div className="p-5 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                    Consignee
                  </span>
                  <span className="text-sm font-semibold truncate block pr-2">
                    {data.consignee}
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                    Shipper
                  </span>
                  <span className="text-sm font-semibold truncate block pr-2">
                    {data.shipper}
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                    Type
                  </span>
                  <span className="text-sm font-semibold truncate block">
                    {data.type}
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                    {data.type === "EXPORT" ? "Open CY / ETD" : "ETA"}
                  </span>
                  <span className="text-sm font-semibold truncate block">
                    {data.type === "EXPORT"
                      ? data.openCy
                        ? format(new Date(data.openCy), "dd MMM yyyy")
                        : format(new Date(data.etd), "dd MMM yyyy")
                      : format(new Date(data.eta), "dd MMM yyyy")}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 border-b border-border pb-1">
                  <ListTodo className="w-3.5 h-3.5" /> Pending Todos (
                  {data.todos?.length || 0})
                </h4>
                {data.todos && data.todos.length > 0 ? (
                  <ul className="space-y-2">
                    {data.todos.slice(0, 3).map((todo: Todo) => (
                      <li
                        key={todo.id}
                        className="text-xs flex items-start gap-2 bg-muted/30 p-2 rounded-lg border border-border"
                      >
                        <div className="w-3 h-3 rounded-full border border-primary/50 mt-0.5 shrink-0" />
                        <span className="text-foreground truncate">
                          {todo.text}
                        </span>
                      </li>
                    ))}
                    {data.todos.length > 3 && (
                      <li className="text-[10px] text-muted-foreground pl-5">
                        + {data.todos.length - 3} more
                      </li>
                    )}
                  </ul>
                ) : (
                  <p className="text-xs text-muted-foreground italic">
                    All caught up!
                  </p>
                )}
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 border-b border-border pb-1">
                  <History className="w-3.5 h-3.5" /> Latest Activity
                </h4>
                {data.activityLogs && data.activityLogs.length > 0 ? (
                  <div className="bg-muted/50 p-3 rounded-xl border border-border text-sm">
                    <p className="text-foreground">
                      {data.activityLogs[0].message}
                    </p>
                    <span className="text-[10px] text-muted-foreground mt-1.5 block">
                      {format(
                        new Date(data.activityLogs[0].createdAt),
                        "dd MMM yyyy HH:mm",
                      )}
                    </span>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">
                    No recent activity recorded.
                  </p>
                )}
              </div>
            </div>

            <DialogFooter className="bg-muted p-4 border-t border-border">
              <Button
                asChild
                className="w-full gap-2 font-bold tracking-wide rounded-xl"
              >
                <Link href={`/shipments/${data.id}`}>
                  Inspect Detail <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
