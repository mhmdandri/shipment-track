"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";

export async function addTodoAction(shipmentId: string, text: string) {
  try {
    await prisma.todo.create({
      data: {
        shipmentId,
        text,
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
    await prisma.todo.update({
      where: { id },
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
    await prisma.todo.delete({
      where: { id }
    });
    revalidatePath(`/shipments/${shipmentId}`);
    return { success: true };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to delete todo";
    return { success: false, error: errorMessage };
  }
}
