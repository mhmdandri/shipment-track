import { DashboardCards } from "@/features/dashboard/DashboardCard";
import { ReminderBoard } from "@/features/dashboard/ReminderBoard";
import { DashboardService } from "@/service/dashboard-service";
import prisma from "@/lib/prisma";
export const revalidate = 0;

const service = new DashboardService(prisma);

export default async function DashboardPage() {
  const [stats, boardData] = await Promise.all([
    service.getMetrics(),
    service.getActionBoard(),
  ]);

  return (
    <div className="space-y-8 p-8 min-h-screen bg-slate-50/30">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-black tracking-tight text-slate-900">
          Import Export CS Command Dashboard
        </h1>
        <p className="text-sm text-slate-500 font-medium">
          Real-time status updates and exception management queues.
        </p>
      </div>
      <DashboardCards stats={stats} />
      <div className="pt-2">
        <ReminderBoard data={boardData} />
      </div>
    </div>
  );
}
