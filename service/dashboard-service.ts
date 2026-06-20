import { PrismaClient } from "@/app/generated/prisma/client";
import { ActionBoardData, DashboardStats } from "@/lib";
import { startOfDay, endOfDay, endOfWeek } from "date-fns";

export class DashboardService {
  constructor(private prisma: PrismaClient) { }

  async getMetrics(): Promise<DashboardStats> {
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

    const [totalActive, needActionToday, overdueReminders, etaThisWeek] =
      await Promise.all([
        this.prisma.shipment.count({ where: { status: "ACTIVE" } }),
        this.prisma.reminder.count({
          where: {
            completed: false,
            dueDate: { gte: todayStart, lte: todayEnd },
          },
        }),
        this.prisma.reminder.count({
          where: {
            completed: false,
            dueDate: { lt: todayStart },
          },
        }),
        this.prisma.shipment.count({
          where: {
            status: "ACTIVE",
            eta: { gte: todayStart, lte: weekEnd },
          },
        }),
      ]);

    return { totalActive, needActionToday, overdueReminders, etaThisWeek };
  }

  async getActionBoard(): Promise<ActionBoardData> {
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);

    const baseInclude = { include: { shipment: true } };

    const [overdue, today, upcoming] = await Promise.all([
      this.prisma.reminder.findMany({
        where: { completed: false, dueDate: { lt: todayStart } },
        orderBy: { dueDate: "asc" },
        ...baseInclude,
      }),
      this.prisma.reminder.findMany({
        where: {
          completed: false,
          dueDate: { gte: todayStart, lte: todayEnd },
        },
        orderBy: { priority: "desc" },
        ...baseInclude,
      }),
      this.prisma.reminder.findMany({
        where: { completed: false, dueDate: { gt: todayEnd } },
        orderBy: { dueDate: "asc" },
        take: 15,
        ...baseInclude,
      }),
    ]);

    return { overdue, today, upcoming };
  }
}
