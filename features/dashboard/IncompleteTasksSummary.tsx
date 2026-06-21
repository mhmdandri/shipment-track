"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, ClipboardList } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

import { ShipmentWithTasks } from "@/lib";

interface IncompleteTasksSummaryProps {
  shipments: ShipmentWithTasks[];
}

export function IncompleteTasksSummary({ shipments }: IncompleteTasksSummaryProps) {
  // Filter shipments to only those that have incomplete tasks
  const activeWithIncomplete = shipments.filter(
    (s) => s.tasks && s.tasks.length > 0
  );

  return (
    <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden flex flex-col">
      <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between">
        <div>
          <h3 className="font-bold text-foreground text-sm tracking-wide uppercase flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-primary" /> Active Pipeline Tasks Summary
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5 font-medium">
            Overview of incomplete operational tasks for active shipments.
          </p>
        </div>
        <Badge variant="outline" className="font-bold text-xs bg-muted/50 border-border">
          {activeWithIncomplete.length} Shipments Active
        </Badge>
      </div>

      <div className="overflow-x-auto">
        {activeWithIncomplete.length === 0 ? (
          <div className="py-12 flex justify-center items-center">
            <EmptyState
              title="All Tasks Completed"
              description="No active shipments have pending tasks in the workflow pipeline."
              icon={<ClipboardList className="w-8 h-8" />}
            />
          </div>
        ) : (
          <>
            {/* Mobile View (Card List) */}
            <div className="md:hidden divide-y divide-border">
              {activeWithIncomplete.map((shipment) => {
                const totalTasks = 18;
                const incompleteCount = shipment.tasks.length;
                const completedCount = totalTasks - incompleteCount;
                const progressPercentage = Math.round((completedCount / totalTasks) * 100);
                const nextPendingTask = shipment.tasks[0];

                return (
                  <div key={shipment.id} className="p-4 space-y-3">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <span className="font-bold text-foreground block">{shipment.jobNo}</span>
                        <span className="text-xs text-muted-foreground block truncate max-w-55">
                          {shipment.consignee}
                        </span>
                      </div>
                      <Button variant="ghost" size="xs" asChild>
                        <Link href={`/shipments/${shipment.id}`}>
                          Inspect <ArrowUpRight className="w-3.5 h-3.5" />
                        </Link>
                      </Button>
                    </div>

                    {nextPendingTask && (
                      <div className="text-xs space-y-1">
                        <span className="text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">
                          Next Pending Milestone
                        </span>
                        <span className="text-foreground font-bold block">{nextPendingTask.title}</span>
                        {nextPendingTask.notes && (
                          <span className="text-[11px] text-muted-foreground block italic bg-muted p-2 rounded-lg border border-border">
                            📝 {nextPendingTask.notes}
                          </span>
                        )}
                      </div>
                    )}

                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground font-bold">
                        <span>{progressPercentage}% Completed</span>
                        <span>{incompleteCount} / {totalTasks} pending</span>
                      </div>
                      <Progress value={progressPercentage} className="h-1.5 bg-muted" />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop View (Table) */}
            <table className="hidden md:table w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/40 border-b border-border text-muted-foreground font-semibold text-xs uppercase tracking-wider">
                  <th className="p-4">Job / Consignee</th>
                  <th className="p-4 hidden md:table-cell">Next Pending Milestone</th>
                  <th className="p-4">Workflow Progress</th>
                  <th className="p-4 hidden sm:table-cell text-center">Remaining Tasks</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-sm text-foreground font-medium">
                {activeWithIncomplete.map((shipment) => {
                  const totalTasks = 18;
                  const incompleteCount = shipment.tasks.length;
                  const completedCount = totalTasks - incompleteCount;
                  const progressPercentage = Math.round((completedCount / totalTasks) * 100);
                  const nextPendingTask = shipment.tasks[0];

                  return (
                    <tr key={shipment.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-4 max-w-50">
                        <span className="text-foreground font-bold block truncate">
                          {shipment.jobNo}
                        </span>
                        <span className="text-xs text-muted-foreground block truncate mt-0.5">
                          {shipment.consignee}
                        </span>
                      </td>
                      <td className="p-4">
                        {nextPendingTask ? (
                          <div className="space-y-1">
                            <span className="text-foreground font-semibold text-sm">
                              {nextPendingTask.title}
                            </span>
                            {nextPendingTask.notes && (
                              <span className="text-xs text-muted-foreground block italic truncate max-w-62.5">
                                📝 {nextPendingTask.notes}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs font-semibold">None</span>
                        )}
                      </td>
                      <td className="p-4 min-w-37.5">
                        <div className="space-y-1.5 max-w-50">
                          <div className="flex items-center justify-between text-xs font-bold text-muted-foreground">
                            <span>{progressPercentage}% Completed</span>
                          </div>
                          <Progress value={progressPercentage} className="h-1.5 bg-muted" />
                        </div>
                      </td>
                      <td className="p-4 text-center font-bold text-muted-foreground text-xs">
                        {incompleteCount} / {totalTasks} pending
                      </td>
                      <td className="p-4 text-right">
                        <Button variant="ghost" size="xs" asChild>
                          <Link href={`/shipments/${shipment.id}`}>
                            Inspect <ArrowUpRight className="w-3.5 h-3.5" />
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
}
