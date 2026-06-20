import { ActivityLog } from "@/app/generated/prisma/client";
import { format } from "date-fns";
import { History } from "lucide-react";

export function ActivityLogsCard({ logs }: { logs: ActivityLog[] }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 flex flex-col h-full">
      <div className="flex items-center gap-2 mb-6 pb-3 border-b border-slate-100">
        <History className="w-4 h-4 text-slate-500" />
        <h3 className="font-bold text-slate-900 text-sm tracking-wide uppercase">
          Activity Trail
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto max-h-[500px] pr-2">
        {logs.length === 0 ? (
          <div className="text-center py-8 text-xs font-semibold text-slate-400">
            No logged events for this file.
          </div>
        ) : (
          <div className="relative border-l-2 border-slate-100 pl-4 ml-2 space-y-5">
            {logs.map((log) => (
              <div key={log.id} className="relative group">
                {/* Timeline Node */}
                <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full border-2 border-cyan-500 bg-white group-hover:bg-cyan-500 transition-colors" />

                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold text-slate-400 block font-mono">
                    {format(new Date(log.createdAt), "dd MMM yyyy HH:mm:ss")}
                  </span>
                  <p className="text-xs font-semibold text-slate-700 leading-relaxed break-words">
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
