"use client";

import { useState, useTransition } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { ShipmentWithRelations } from "@/lib";
import { toggleTaskAction, updateTaskNoteAction } from "@/actions/shipment-action";
import { useProgress } from "@bprogress/next";

export function WorkflowChecklist({
  shipment,
}: {
  shipment: ShipmentWithRelations;
}) {
  const [isPending, startTransition] = useTransition();
  const { start: startProgress, stop: stopProgress } = useProgress();
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");

  const handleStartEdit = (taskId: string, currentNotes: string | null) => {
    setEditingTaskId(taskId);
    setNoteText(currentNotes || "");
  };

  return (
    <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden p-6">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
        <h3 className="font-bold text-foreground text-sm tracking-wide uppercase">
          Operational Step Checklist
        </h3>
        {isPending && (
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
        )}
      </div>
      <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-2">
        {shipment.tasks.map((task) => (
          <div
            key={task.id}
            className={`flex flex-col gap-2 p-3 rounded-xl border transition-all ${
              task.completed
                ? "bg-muted/50 border-border"
                : "bg-card border-border hover:border-border/80"
            }`}
          >
            <div className="flex items-start gap-4">
              <Checkbox
                checked={task.completed}
                disabled={isPending}
                onCheckedChange={(checked) => {
                  startProgress();
                  startTransition(async () => {
                    try {
                      await toggleTaskAction(task.id, shipment.id, !!checked);
                    } finally {
                      stopProgress();
                    }
                  });
                }}
                className="h-4.5 w-4.5 rounded border-border mt-0.5"
              />
              <div className="flex-1 min-w-0">
                <span
                  className={`text-sm font-semibold block ${task.completed ? "text-muted-foreground line-through" : "text-foreground"}`}
                >
                  {task.title}
                </span>
                {task.completedAt && (
                  <span className="text-[10px] font-medium text-muted-foreground mt-0.5 block">
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
                className="text-xs text-muted-foreground hover:text-primary font-medium transition-colors shrink-0"
              >
                {editingTaskId === task.id ? "Cancel" : task.notes ? "Edit Note" : "+ Add Note"}
              </button>
            </div>

            {editingTaskId === task.id ? (
              <div className="mt-1 pl-8 flex gap-2 items-center">
                <input
                  type="text"
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="E.g., booking trucking, waiting SPPB & DO..."
                  className="flex-1 text-xs px-2.5 py-1.5 border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-ring font-medium text-foreground bg-muted"
                  disabled={isPending}
                />
                <button
                  type="button"
                  onClick={() => {
                    startProgress();
                    startTransition(async () => {
                      try {
                        const res = await updateTaskNoteAction(task.id, shipment.id, noteText);
                        if (res.success) {
                          setEditingTaskId(null);
                        }
                      } finally {
                        stopProgress();
                      }
                    });
                  }}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground text-[10px] font-semibold px-3 py-1.5 rounded-lg shadow-sm transition-colors"
                  disabled={isPending}
                >
                  Save
                </button>
              </div>
            ) : (
              task.notes && (
                <div className="mt-0.5 pl-8">
                  <div className="bg-muted border border-border rounded-lg p-2.5 text-xs font-medium text-muted-foreground flex items-start gap-1.5 italic">
                    <span className="text-muted-foreground not-italic">📝</span>
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
