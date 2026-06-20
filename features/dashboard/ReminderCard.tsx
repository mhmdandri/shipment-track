"use server";

import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { toggleReminderAction } from "@/actions/shipment-action";

const priorityVariants: Record<string, string> = {
  LOW: "bg-slate-100 text-slate-800 border-slate-200",
  MEDIUM: "bg-blue-50 text-blue-700 border-blue-200",
  HIGH: "bg-amber-50 text-amber-700 border-amber-200",
  URGENT: "bg-rose-50 text-rose-700 border-rose-200 animate-pulse",
};

export async function ReminderCard({ item }: { item: any }) {
  async function completeTask() {
    "use server";
    await toggleReminderAction(item.id, true);
  }

  return (
    <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all flex items-start gap-3">
      <form action={completeTask} className="mt-1">
        <Checkbox
          type="submit"
          checked={item.completed}
          className="h-5 w-5 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
        />
      </form>
      <div className="flex-1 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <span className="font-semibold text-slate-800 text-sm leading-tight block">
            {item.title}
          </span>
          <Badge
            variant="outline"
            className={`text-[10px] font-bold px-2 py-0.5 uppercase ${priorityVariants[item.priority]}`}
          >
            {item.priority}
          </Badge>
        </div>
        <p className="text-xs font-medium text-slate-600">
          Job:{" "}
          <span className="font-bold text-slate-900">
            {item.shipment.jobNo}
          </span>{" "}
          ({item.shipment.consignee})
        </p>
        <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400 font-medium">
          <span>Due: {format(new Date(item.dueDate), "dd MMM yyyy")}</span>
          <span>ETA: {format(new Date(item.shipment.eta), "dd MMM yyyy")}</span>
        </div>
      </div>
    </div>
  );
}
