import { DashboardCards } from "@/features/dashboard/DashboardCard";
import { ReminderBoard } from "@/features/dashboard/ReminderBoard";
import { IncompleteTasksSummary } from "@/features/dashboard/IncompleteTasksSummary";
import { UpcomingEtaPipeline } from "@/features/dashboard/UpcomingEtaPipeline";
import { DashboardService } from "@/service/dashboard-service";
import prisma from "@/lib/prisma";
export const revalidate = 0;

const service = new DashboardService(prisma);

export default async function DashboardPage() {
  const [stats, boardData, activeShipments] = await Promise.all([
    service.getMetrics(),
    service.getActionBoard(),
    service.getActiveShipments(),
  ]);

  return (
    <div className="space-y-6 p-4 pt-16 lg:pt-6 lg:p-8 min-h-screen bg-background">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-black tracking-tight text-foreground">
          Import Export CS Command Dashboard
        </h1>
        <p className="text-sm text-muted-foreground font-medium">
          Real-time status updates and exception management queues.
        </p>
      </div>
      <DashboardCards stats={stats} />
      <div className="space-y-6 pt-2">
        <UpcomingEtaPipeline shipments={activeShipments} />
        <IncompleteTasksSummary shipments={activeShipments} />
      </div>
      <div className="pt-2">
        <ReminderBoard data={boardData} />
      </div>
    </div>
  );
}
