
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
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h4 className="font-bold text-slate-800 text-sm">
            Tracking Completion Metrics
          </h4>
          <p className="text-xs text-slate-500 mt-0.5">
            Current Stage:{" "}
            <span className="font-bold text-cyan-600">
              {shipment.currentStep}
            </span>
          </p>
        </div>
        <span className="text-2xl font-black text-slate-900 tracking-tight">
          {percentage}%
        </span>
      </div>
      <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden border border-slate-200/50">
        <div
          className="bg-cyan-600 h-full transition-all duration-500 ease-out rounded-full shadow-inner"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="flex justify-between text-xs font-semibold text-slate-400">
        <span>
          {completedCount} of {total} Milestones Cleared
        </span>
        <span className="text-amber-700">
          Next Priority: {shipment.nextAction}
        </span>
      </div>
    </div>
  );
}
