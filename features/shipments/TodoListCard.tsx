"use client";

import { useState, useTransition } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Todo } from "@/app/generated/prisma/client";
import {
  addTodoAction,
  toggleTodoAction,
  deleteTodoAction,
} from "@/actions/todo-action";
import { useProgress } from "@bprogress/next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function TodoListCard({
  todos,
  shipmentId,
}: {
  todos: Todo[];
  shipmentId: string;
}) {
  const [isPending, startTransition] = useTransition();
  const { start: startProgress, stop: stopProgress } = useProgress();
  const [newTodoText, setNewTodoText] = useState("");

  const handleAddTodo = () => {
    if (!newTodoText.trim()) return;
    startProgress();
    startTransition(async () => {
      try {
        const res = await addTodoAction(shipmentId, newTodoText);
        if (res.success) {
          setNewTodoText("");
        }
      } finally {
        stopProgress();
      }
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTodo();
    }
  };

  return (
    <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden p-6">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
        <h3 className="font-bold text-foreground text-sm tracking-wide uppercase">
          Ad-hoc Todo List
        </h3>
        {isPending && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
      </div>
      
      <div className="flex items-center gap-2 mb-4">
        <Input
          value={newTodoText}
          onChange={(e) => setNewTodoText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add a new task..."
          className="flex-1 text-sm bg-muted"
          disabled={isPending}
        />
        <Button
          onClick={handleAddTodo}
          disabled={isPending || !newTodoText.trim()}
          size="icon"
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-2">
        {todos.length === 0 ? (
          <p className="text-sm text-muted-foreground italic text-center py-4">No ad-hoc tasks yet.</p>
        ) : (
          todos.map((todo) => (
            <div
              key={todo.id}
              className={`flex items-center justify-between gap-4 p-3 rounded-xl border transition-all ${
                todo.isDone
                  ? "bg-muted/50 border-border"
                  : "bg-card border-border hover:border-border/80"
              }`}
            >
              <div className="flex items-start gap-4 flex-1 min-w-0">
                <Checkbox
                  checked={todo.isDone}
                  disabled={isPending}
                  onCheckedChange={(checked) => {
                    startProgress();
                    startTransition(async () => {
                      try {
                        await toggleTodoAction(todo.id, !!checked, shipmentId);
                      } finally {
                        stopProgress();
                      }
                    });
                  }}
                  className="h-4.5 w-4.5 rounded border-border mt-0.5"
                />
                <span
                  className={`text-sm font-semibold block break-all ${
                    todo.isDone ? "text-muted-foreground line-through" : "text-foreground"
                  }`}
                >
                  {todo.text}
                </span>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={isPending}
                    className="text-muted-foreground hover:text-destructive shrink-0 h-8 w-8"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete this task. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => {
                        startProgress();
                        startTransition(async () => {
                          try {
                            await deleteTodoAction(todo.id, shipmentId);
                          } finally {
                            stopProgress();
                          }
                        });
                      }}
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
