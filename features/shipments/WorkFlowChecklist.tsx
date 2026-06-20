"use client";

import { useState, useTransition } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { ShipmentWithRelations } from "@/lib";
import { toggleTaskAction, updateTaskNoteAction } from "@/actions/shipment-action";

export function WorkflowChecklist({
  shipment,
}: {
  shipment: ShipmentWithRelations;
}) {
  const [isPending, startTransition] = useTransition();
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");

  const handleStartEdit = (taskId: string, currentNotes: string | null) => {
    setEditingTaskId(taskId);
    setNoteText(currentNotes || "");
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden p-6">
      <div className="flex items-center justify-between mb-4 pb-3 border-b">
        <h3 className="font-bold text-slate-900 text-sm tracking-wide uppercase">
          Operational Step Checklist
        </h3>
        {isPending && (
          <Loader2 className="w-4 h-4 animate-spin text-cyan-600" />
        )}
      </div>
      <div className="space-y-2.5 max-h-150 overflow-y-auto pr-2">
        {shipment.tasks.map((task) => (
          <div
            key={task.id}
            className={`flex flex-col gap-2 p-3 rounded-xl border transition-all ${task.completed
                ? "bg-slate-50/80 border-slate-200"
                : "bg-white border-slate-100 hover:border-slate-200"
              }`}
          >
            <div className="flex items-start gap-4">
              <Checkbox
                checked={task.completed}
                disabled={isPending}
                onCheckedChange={(checked) => {
                  startTransition(async () => {
                    await toggleTaskAction(task.id, shipment.id, !!checked);
                  });
                }}
                className="h-4.5 w-4.5 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500 mt-0.5"
              />
              <div className="flex-1 min-w-0">
                <span
                  className={`text-sm font-semibold block ${task.completed ? "text-slate-400 line-through" : "text-slate-800"}`}
                >
                  {task.title}
                </span>
                {task.completedAt && (
                  <span className="text-[10px] font-medium text-slate-400 mt-0.5 block">
                    Completed on{" "}
                    {format(new Date(task.completedAt), "dd MMM yyyy HH:mm")}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  if (editingTaskId === task.id) {
                    setEditingTaskId(null);
                  } else {
                    handleStartEdit(task.id, task.notes);
                  }
                }}
                className="text-xs text-slate-400 hover:text-cyan-600 font-medium transition-colors"
              >
                {editingTaskId === task.id ? "Cancel" : task.notes ? "Edit Note" : "+ Add Note"}
              </button>
            </div>

            {editingTaskId === task.id ? (
              <div className="mt-1 pl-8.5 flex gap-2 items-center">
                <input
                  type="text"
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="E.g., booking trucking, waiting SPPB & DO..."
                  className="flex-1 text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-cyan-500 font-medium text-slate-700 bg-slate-50"
                  disabled={isPending}
                />
                <button
                  type="button"
                  onClick={() => {
                    startTransition(async () => {
                      const res = await updateTaskNoteAction(task.id, shipment.id, noteText);
                      if (res.success) {
                        setEditingTaskId(null);
                      }
                    });
                  }}
                  className="bg-cyan-600 hover:bg-cyan-700 text-white text-[10px] font-semibold px-3 py-1.5 rounded-lg shadow-sm"
                  disabled={isPending}
                >
                  Save
                </button>
              </div>
            ) : (
              task.notes && (
                <div className="mt-0.5 pl-8.5">
                  <div className="bg-slate-50 border border-slate-100 rounded-lg p-2.5 text-xs font-medium text-slate-600 flex items-start gap-1.5 italic">
                    <span className="text-slate-400 not-italic">📝</span>
                    <span className="break-all">{task.notes}</span>
                  </div>
                </div>
              )
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
