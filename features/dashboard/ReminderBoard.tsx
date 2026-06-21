import { ReminderCard } from "./ReminderCard";
import { EmptyState } from "@/components/ui/empty-state";
import { ActionBoardData } from "@/lib";
import { Inbox } from "lucide-react";

export function ReminderBoard({ data }: { data: ActionBoardData }) {
  const columns = [
    {
      title: "Overdue Reminders",
      items: data.overdue,
      bg: "bg-destructive/5 border-destructive/20",
      titleColor: "text-destructive",
    },
    {
      title: "Action Required Today",
      items: data.today,
      bg: "bg-amber-50/60 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900",
      titleColor: "text-amber-700 dark:text-amber-400",
    },
    {
      title: "Upcoming Milestones",
      items: data.upcoming,
      bg: "bg-muted/60 border-border",
      titleColor: "text-foreground",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 items-start">
      {columns.map((col, idx) => (
        <div
          key={idx}
          className={`p-4 rounded-2xl border ${col.bg} h-120 flex flex-col`}
        >
          <div className="flex items-center justify-between mb-4 px-1 pb-1 border-b border-border/10 shrink-0">
            <h3
              className={`font-bold text-xs tracking-wider uppercase ${col.titleColor}`}
            >
              {col.title}
            </h3>
            <span className="bg-card border border-border text-xs px-2 py-0.5 rounded-full font-bold shadow-sm text-foreground">
              {col.items.length}
            </span>
          </div>
          <div className="space-y-3 flex-1 overflow-y-auto pr-1">
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
