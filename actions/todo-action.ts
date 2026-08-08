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
    await prisma.todo.update({
      where: { id: cleanId },
      data: { isDone }
    });
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
    await prisma.todo.delete({
      where: { id: cleanId }
    });
    revalidatePath(`/shipments/${shipmentId}`);
    return { success: true };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to delete todo";
    return { success: false, error: errorMessage };
  }
}

