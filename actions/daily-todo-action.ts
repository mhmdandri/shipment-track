"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { dailyTodoSchema, idParamSchema } from "@/lib/validator";

export async function getDailyTodosAction() {
  try {
    await requireAuth();
    const todos = await prisma.dailyTodo.findMany({
      orderBy: { createdAt: "desc" },
    });
    return { success: true, data: todos };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to fetch todos" };
  }
}

export async function createDailyTodoAction(text: string) {
  try {
    await requireAuth();
    const validated = dailyTodoSchema.parse({ text });
    const todo = await prisma.dailyTodo.create({
      data: { text: validated.text },
    });
    revalidatePath("/todos");
    return { success: true, data: todo };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to create todo" };
  }
}

export async function toggleDailyTodoAction(id: string, isDone: boolean) {
  try {
    await requireAuth();
    const cleanId = idParamSchema.parse(id);
    const todo = await prisma.dailyTodo.update({
      where: { id: cleanId },
      data: { isDone },
    });
    revalidatePath("/todos");
    return { success: true, data: todo };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to toggle todo" };
  }
}

export async function deleteDailyTodoAction(id: string) {
  try {
    await requireAuth();
    const cleanId = idParamSchema.parse(id);
    await prisma.dailyTodo.delete({
      where: { id: cleanId },
    });
    revalidatePath("/todos");
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to delete todo" };
  }
}

