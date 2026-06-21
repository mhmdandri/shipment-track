"use server";

import { revalidatePath } from "next/cache";
import { ShipmentRepository } from "@/repositories/shipment-repository";
import { ShipmentService } from "@/service/shipment-service";
import { shipmentSchema } from "@/lib/validator";
import prisma from "@/lib/prisma";

const repo = new ShipmentRepository(prisma);
const service = new ShipmentService(repo);

export async function createShipmentAction(formData: unknown) {
  try {
    const validated = shipmentSchema.parse(formData);
    const result = await service.createShipment(validated);
    revalidatePath("/shipments");
    revalidatePath("/");
    return { success: true, data: result };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to create shipment";
    return {
      success: false,
      error: errorMessage,
    };
  }
}

export async function toggleTaskAction(
  taskId: string,
  shipmentId: string,
  completed: boolean,
  notes?: string,
) {
  try {
    await service.toggleTaskProgress(taskId, shipmentId, completed, notes);
    revalidatePath(`/shipments/${shipmentId}`);
    revalidatePath("/");
    return { success: true };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to update pipeline task";
    return {
      success: false,
      error: errorMessage,
    };
  }
}

export async function updateTaskNoteAction(
  taskId: string,
  shipmentId: string,
  notes: string,
) {
  try {
    await service.updateTaskNote(taskId, shipmentId, notes);
    revalidatePath(`/shipments/${shipmentId}`);
    revalidatePath("/");
    return { success: true };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to update step note";
    return {
      success: false,
      error: errorMessage,
    };
  }
}

export async function toggleReminderAction(
  id: string,
  completed: boolean,
  shipmentId?: string,
) {
  try {
    await service.toggleReminderProgress(id, completed);
    revalidatePath("/");
    if (shipmentId) revalidatePath(`/shipments/${shipmentId}`);
    return { success: true };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to update action step priority";
    return { success: false, error: errorMessage };
  }
}
