import {
  PrismaClient,
  Shipment,
  ShipmentStatus,
} from "@/app/generated/prisma/client";
import { ShipmentWithRelations } from "@/lib";

export class ShipmentRepository {
  constructor(private prisma: PrismaClient) { }

  async create(data: any): Promise<ShipmentWithRelations> {
    return this.prisma.shipment.create({
      data,
      include: { tasks: true, reminders: true, activityLogs: true },
    });
  }

  async findById(id: string): Promise<ShipmentWithRelations | null> {
    return this.prisma.shipment.findUnique({
      where: { id },
      include: {
        tasks: { orderBy: { stepOrder: "asc" } },
        reminders: { orderBy: { dueDate: "asc" } },
        activityLogs: { orderBy: { createdAt: "desc" } },
      },
    });
  }

  async createActivityLog(shipmentId: string, message: string): Promise<any> {
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
    const where: any = {};
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
  ): Promise<any> {
    return this.prisma.shipmentTask.update({
      where: { id: taskId },
      data: { completed, completedAt, notes },
    });
  }

  async updateReminder(id: string, completed: boolean): Promise<any> {
    return this.prisma.reminder.update({
      where: { id },
      data: { completed },
    });
  }
}
