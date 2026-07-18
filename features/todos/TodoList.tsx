"use client";

import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trash2, CheckCircle2, Circle, Plus, Loader2 } from "lucide-react";
import { DailyTodo } from "@/app/generated/prisma/client";
import {
  createDailyTodoAction,
  toggleDailyTodoAction,
  deleteDailyTodoAction,
} from "@/actions/daily-todo-action";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export function TodoList({ initialTodos }: { initialTodos: DailyTodo[] }) {
  const [todos, setTodos] = useState<DailyTodo[]>(initialTodos);
  const [newTodo, setNewTodo] = useState("");
  const [isPending, startTransition] = useTransition();

  // Optimistic UI updates
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodo.trim()) return;

    const text = newTodo.trim();
    setNewTodo("");

    startTransition(async () => {
      const res = await createDailyTodoAction(text);
      if (res.success && res.data) {
        setTodos((prev) => [res.data, ...prev]);
      }
    });
  };

  const handleToggle = async (id: string, currentStatus: boolean) => {
    // Optimistic update
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isDone: !currentStatus } : t))
    );

    startTransition(async () => {
      await toggleDailyTodoAction(id, !currentStatus);
    });
  };

  const handleDelete = async (id: string) => {
    // Optimistic update
    setTodos((prev) => prev.filter((t) => t.id !== id));

    startTransition(async () => {
      await deleteDailyTodoAction(id);
    });
  };

  const pendingTodos = todos.filter((t) => !t.isDone);
  const completedTodos = todos.filter((t) => t.isDone);

  return (
    <div className="w-full max-w-3xl mx-auto space-y-8">
      {/* Input Section */}
      <div className="bg-card border border-border p-4 rounded-2xl shadow-sm flex items-center gap-3">
        <form onSubmit={handleAdd} className="flex-1 flex items-center gap-3 w-full">
          <Input
            value={newTodo}
            onChange={(e) => setNewTodo(e.target.value)}
            placeholder="What needs to be done today?"
            className="flex-1 border-0 shadow-none focus-visible:ring-0 text-base px-0 bg-transparent"
            disabled={isPending}
          />
          <Button
            type="submit"
            size="icon"
            disabled={!newTodo.trim() || isPending}
            className="rounded-full shrink-0"
          >
            {isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
          </Button>
        </form>
      </div>

      {/* Lists */}
      <div className="space-y-6">
        {/* Pending */}
        <div>
          <h2 className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-3 px-2 flex items-center gap-2">
            Pending <span className="bg-muted px-2 py-0.5 rounded-full">{pendingTodos.length}</span>
          </h2>
          {pendingTodos.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground bg-muted/20 border border-dashed border-border rounded-2xl">
              <p className="text-sm">You are all caught up for now!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {pendingTodos.map((todo) => (
                <TodoItem
                  key={todo.id}
                  todo={todo}
                  onToggle={() => handleToggle(todo.id, todo.isDone)}
                  onDelete={() => handleDelete(todo.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Completed */}
        {completedTodos.length > 0 && (
          <div>
            <h2 className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-3 px-2 flex items-center gap-2">
              Completed <span className="bg-muted px-2 py-0.5 rounded-full">{completedTodos.length}</span>
            </h2>
            <div className="space-y-2 opacity-60">
              {completedTodos.map((todo) => (
                <TodoItem
                  key={todo.id}
                  todo={todo}
                  onToggle={() => handleToggle(todo.id, todo.isDone)}
                  onDelete={() => handleDelete(todo.id)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TodoItem({
  todo,
  onToggle,
  onDelete,
}: {
  todo: DailyTodo;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="group flex items-center justify-between gap-3 p-3 bg-card border border-border rounded-xl hover:border-primary/50 hover:shadow-sm transition-all">
      <Button
        variant="ghost"
        onClick={onToggle}
        className="flex items-center gap-3 flex-1 justify-start h-auto p-2 hover:bg-transparent"
      >
        {todo.isDone ? (
          <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
        ) : (
          <Circle className="w-5 h-5 text-muted-foreground shrink-0" />
        )}
        <div className="flex flex-col text-left">
          <span
            className={cn(
              "text-sm font-medium transition-colors",
              todo.isDone && "line-through text-muted-foreground"
            )}
          >
            {todo.text}
          </span>
          <span className="text-[10px] text-muted-foreground/70 font-mono mt-0.5">
            {format(new Date(todo.createdAt), "dd MMM yyyy, HH:mm")}
          </span>
        </div>
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 rounded-lg"
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  );
}
