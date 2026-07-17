import {
  PrismaClient,
  Shipment,
  ShipmentStatus,
  ShipmentTask,
  Reminder,
  ActivityLog,
  Prisma,
} from "@/app/generated/prisma/client";
import { ShipmentWithRelations } from "@/lib";

export class ShipmentRepository {
  constructor(private prisma: PrismaClient) { }

  async create(data: Prisma.ShipmentCreateInput): Promise<ShipmentWithRelations> {
    return this.prisma.shipment.create({
      data,
      include: { tasks: true, reminders: true, activityLogs: true, todos: true },
    }) as unknown as Promise<ShipmentWithRelations>;
  }

  async updateShipment(id: string, data: Prisma.ShipmentUpdateInput): Promise<Shipment> {
    return this.prisma.shipment.update({
      where: { id },
      data,
    });
  }

  async findById(id: string): Promise<ShipmentWithRelations | null> {
    return this.prisma.shipment.findUnique({
      where: { id },
      include: {
        tasks: { orderBy: { stepOrder: "asc" } },
        reminders: { orderBy: { dueDate: "asc" } },
        activityLogs: { orderBy: { createdAt: "desc" } },
        todos: { orderBy: { createdAt: "asc" } },
      },
    });
  }

  async createActivityLog(shipmentId: string, message: string): Promise<ActivityLog> {
    return this.prisma.activityLog.create({
      data: { shipmentId, message },
    });
  }

  async findAll(params: {
    search?: string;
    status?: ShipmentStatus;
    sortByEta?: "asc" | "desc";
    skip: number;
    take: number;
  }) {
    const where: Prisma.ShipmentWhereInput = {};
    if (params.status) {
      where.status = params.status;
    }
    if (params.search) {
      where.OR = [
        { jobNo: { contains: params.search, mode: "insensitive" } },
        { blNo: { contains: params.search, mode: "insensitive" } },
        { consignee: { contains: params.search, mode: "insensitive" } },
        { shipper: { contains: params.search, mode: "insensitive" } },
      ];
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.shipment.findMany({
        where,
        orderBy: [
          { status: "asc" },
          { eta: params.sortByEta ?? "asc" },
        ],
        skip: params.skip,
        take: params.take,
      }),
      this.prisma.shipment.count({ where }),
    ]);

    return { items, total };
  }

  async updateStep(
    id: string,
    currentStep: number,
    nextAction: string,
    status: ShipmentStatus,
  ): Promise<Shipment> {
    return this.prisma.shipment.update({
      where: { id },
      data: { currentStep, nextAction, status },
    });
  }

  async updateTask(
    taskId: string,
    completed: boolean,
    completedAt: Date | null,
    notes?: string,
  ): Promise<ShipmentTask> {
    return this.prisma.shipmentTask.update({
      where: { id: taskId },
      data: { completed, completedAt, notes },
    });
  }

  async updateReminder(id: string, completed: boolean): Promise<Reminder> {
    return this.prisma.reminder.update({
      where: { id },
      data: { completed },
    });
  }

  async findReminderById(id: string): Promise<Reminder | null> {
    return this.prisma.reminder.findUnique({
      where: { id },
    });
  }

  async findReminderByTitle(shipmentId: string, title: string): Promise<Reminder | null> {
    return this.prisma.reminder.findFirst({
      where: { shipmentId, title },
    });
  }

  async findTaskByTitle(shipmentId: string, title: string): Promise<ShipmentTask | null> {
    return this.prisma.shipmentTask.findFirst({
      where: { shipmentId, title },
    });
  }
}
