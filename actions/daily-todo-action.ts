"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getDailyTodosAction() {
  try {
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
    const todo = await prisma.dailyTodo.create({
      data: { text },
    });
    revalidatePath("/todos");
    return { success: true, data: todo };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to create todo" };
  }
}

export async function toggleDailyTodoAction(id: string, isDone: boolean) {
  try {
    const todo = await prisma.dailyTodo.update({
      where: { id },
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
    await prisma.dailyTodo.delete({
      where: { id },
    });
    revalidatePath("/todos");
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to delete todo" };
  }
}
