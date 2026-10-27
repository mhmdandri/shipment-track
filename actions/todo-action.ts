"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { todoSchema, idParamSchema } from "@/lib/validator";

export async function addTodoAction(shipmentId: string, text: string) {
  try {
    await requireAuth();
    const validated = todoSchema.parse({ shipmentId, text });
    await prisma.todo.create({
      data: {
        shipmentId: validated.shipmentId,
        text: validated.text,
      }
    });
    revalidatePath(`/shipments/${shipmentId}`);
    return { success: true };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to add todo";
    return { success: false, error: errorMessage };
  }
}

export async function toggleTodoAction(id: string, isDone: boolean, shipmentId: string) {
  try {
    await requireAuth();
    const cleanId = idParamSchema.parse(id);
    const result = await prisma.todo.updateMany({
      where: { id: cleanId, shipmentId },
      data: { isDone }
    });
    if (result.count !== 1) throw new Error("Todo tidak ditemukan pada shipment tersebut");
    revalidatePath(`/shipments/${shipmentId}`);
    return { success: true };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to toggle todo";
    return { success: false, error: errorMessage };
  }
}

export async function deleteTodoAction(id: string, shipmentId: string) {
  try {
    await requireAuth();
    const cleanId = idParamSchema.parse(id);
    const result = await prisma.todo.deleteMany({
      where: { id: cleanId, shipmentId }
    });
    if (result.count !== 1) throw new Error("Todo tidak ditemukan pada shipment tersebut");
    revalidatePath(`/shipments/${shipmentId}`);
    return { success: true };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to delete todo";
    return { success: false, error: errorMessage };
  }
}
