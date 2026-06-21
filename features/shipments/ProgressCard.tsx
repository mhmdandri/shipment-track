
import { ShipmentWithRelations } from "@/lib";

export function ProgressCard({
  shipment,
}: {
  shipment: ShipmentWithRelations;
}) {
  const total = shipment.tasks.length;
  const completedCount = shipment.tasks.filter((t) => t.completed).length;
  const rawPercentage = total > 0 ? (completedCount / total) * 100 : 0;
  const percentage = Math.round(rawPercentage);

  return (
    <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h4 className="font-bold text-foreground text-sm">
            Tracking Completion Metrics
          </h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            Current Stage:{" "}
            <span className="font-bold text-primary">
              {shipment.currentStep}
            </span>
          </p>
        </div>
        <span className="text-2xl font-black text-foreground tracking-tight">
          {percentage}%
        </span>
      </div>
      <div className="w-full bg-muted h-3 rounded-full overflow-hidden border border-border/50">
        <div
          className="bg-primary h-full transition-all duration-500 ease-out rounded-full shadow-inner"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="flex justify-between text-xs font-semibold text-muted-foreground">
        <span>
          {completedCount} of {total} Milestones Cleared
        </span>
        <span className="text-amber-600 dark:text-amber-400">
          Next Priority: {shipment.nextAction}
        </span>
      </div>
    </div>
  );
}
