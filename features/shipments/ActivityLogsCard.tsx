import { ActivityLog } from "@/app/generated/prisma/client";
import { format } from "date-fns";
import { History } from "lucide-react";

export function ActivityLogsCard({ logs }: { logs: ActivityLog[] }) {
  return (
    <div className="bg-card border border-border rounded-2xl shadow-sm p-6 flex flex-col h-full">
      <div className="flex items-center gap-2 mb-6 pb-3 border-b border-border">
        <History className="w-4 h-4 text-muted-foreground" />
        <h3 className="font-bold text-foreground text-sm tracking-wide uppercase">
          Activity Trail
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto max-h-125 pr-2">
        {logs.length === 0 ? (
          <div className="text-center py-8 text-xs font-semibold text-muted-foreground">
            No logged events for this file.
          </div>
        ) : (
          <div className="relative border-l-2 border-border pl-4 ml-2 space-y-5">
            {logs.map((log) => (
              <div key={log.id} className="relative group">
                {/* Timeline Node */}
                <div className="absolute -left-5.25 top-1 w-2.5 h-2.5 rounded-full border-2 border-primary bg-card group-hover:bg-primary transition-colors" />

                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold text-muted-foreground block font-mono">
                    {format(new Date(log.createdAt), "dd MMM yyyy HH:mm:ss")}
                  </span>
                  <p className="text-xs font-semibold text-foreground leading-relaxed warp-break-words">
                    {log.message}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
