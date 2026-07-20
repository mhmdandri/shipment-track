"use server";

import { revalidatePath } from "next/cache";
import { ShipmentRepository } from "@/repositories/shipment-repository";
import { ShipmentService } from "@/service/shipment-service";
import { shipmentSchema, updateShipmentDatesSchema } from "@/lib/validator";
import prisma from "@/lib/prisma";
import { ActionResponse, ShipmentWithRelations } from "@/lib";
import { z } from "zod";

const repo = new ShipmentRepository(prisma);
const service = new ShipmentService(repo);

function handleError(error: unknown): { success: false; error: string; code?: string } {
  if (error instanceof z.ZodError) {
    return { success: false, error: error.errors.map(e => e.message).join(", "), code: "VALIDATION_ERROR" };
  }
  return {
    success: false,
    error: error instanceof Error ? error.message : "An unexpected error occurred",
  };
}

export async function createShipmentAction(formData: unknown): Promise<ActionResponse<ShipmentWithRelations>> {
  try {
    const validated = shipmentSchema.parse(formData);
    const result = await service.createShipment(validated);
    revalidatePath("/shipments");
    revalidatePath("/");
    return { success: true, data: result };
  } catch (error: unknown) {
    return handleError(error);
  }
}

export async function updateShipmentDatesAction(id: string, formData: unknown): Promise<ActionResponse> {
  try {
    const validated = updateShipmentDatesSchema.parse(formData);
    await service.updateShipmentDates(id, validated);
    revalidatePath(`/shipments/${id}`);
    revalidatePath("/");
    return { success: true, data: undefined };
  } catch (error: unknown) {
    return handleError(error);
  }
}

export async function toggleTaskAction(
  taskId: string,
  shipmentId: string,
  completed: boolean,
  notes?: string,
): Promise<ActionResponse> {
  try {
    await service.toggleTaskProgress(taskId, shipmentId, completed, notes);
    revalidatePath(`/shipments/${shipmentId}`);
    revalidatePath("/");
    return { success: true, data: undefined };
  } catch (error: unknown) {
    return handleError(error);
  }
}

export async function updateTaskNoteAction(
  taskId: string,
  shipmentId: string,
  notes: string,
): Promise<ActionResponse> {
  try {
    await service.updateTaskNote(taskId, shipmentId, notes);
    revalidatePath(`/shipments/${shipmentId}`);
    revalidatePath("/");
    return { success: true, data: undefined };
  } catch (error: unknown) {
    return handleError(error);
  }
}

export async function toggleReminderAction(
  id: string,
  completed: boolean,
  shipmentId?: string,
): Promise<ActionResponse> {
  try {
    await service.toggleReminderProgress(id, completed);
    revalidatePath("/");
    if (shipmentId) revalidatePath(`/shipments/${shipmentId}`);
    return { success: true, data: undefined };
  } catch (error: unknown) {
    return handleError(error);
  }
}

// We'll use unknown here for quick view return type or define a specific interface
export async function getShipmentQuickViewAction(id: string): Promise<ActionResponse<unknown>> {
  try {
    const shipment = await prisma.shipment.findUnique({
      where: { id },
      include: {
        activityLogs: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        todos: {
          where: { isDone: false },
          orderBy: { createdAt: "desc" },
          take: 5, // Show up to 5 pending todos in quick view
        }
      }
    });
    if (!shipment) return { success: false, error: "Shipment not found", code: "NOT_FOUND" };
    return { success: true, data: shipment };
  } catch (error: unknown) {
    return handleError(error);
  }
}
