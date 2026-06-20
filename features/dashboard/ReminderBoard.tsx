import { ReminderCard } from "./ReminderCard";
import { EmptyState } from "@/components/ui/empty-state";
import { ActionBoardData } from "@/lib";
import { Inbox } from "lucide-react";

export function ReminderBoard({ data }: { data: ActionBoardData }) {
  const columns = [
    {
      title: "Overdue Reminders",
      items: data.overdue,
      bg: "bg-rose-50/60 border-rose-100",
      titleColor: "text-rose-800",
    },
    {
      title: "Action Required Today",
      items: data.today,
      bg: "bg-amber-50/60 border-amber-100",
      titleColor: "text-amber-800",
    },
    {
      title: "Upcoming Milestones",
      items: data.upcoming,
      bg: "bg-slate-50/60 border-slate-100",
      titleColor: "text-slate-800",
    },
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-3 items-start">
      {columns.map((col, idx) => (
        <div
          key={idx}
          className={`p-4 rounded-2xl border ${col.bg} min-h-112.5 flex flex-col`}
        >
          <div className="flex items-center justify-between mb-4 px-1">
            <h3
              className={`font-bold text-sm tracking-wide uppercase ${col.titleColor}`}
            >
              {col.title}
            </h3>
            <span className="bg-white border text-xs px-2 py-0.5 rounded-full font-bold shadow-sm">
              {col.items.length}
            </span>
          </div>
          <div className="space-y-3 flex-1 overflow-y-auto max-h-[600px] pr-1">
            {col.items.length === 0 ? (
              <div className="h-full flex items-center justify-center py-12">
                <EmptyState
                  title="Clear Slate"
                  description="No active reminders pending attention in this quadrant."
                  icon={<Inbox className="w-8 h-8" />}
                />
              </div>
            ) : (
              col.items.map((item) => (
                <ReminderCard key={item.id} item={item} />
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
