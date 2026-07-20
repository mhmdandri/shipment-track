import { getDailyTodosAction } from "@/actions/daily-todo-action";
import { TodoList } from "@/features/todos/TodoList";
import { ListTodo } from "lucide-react";

export const revalidate = 0;

export default async function TodosPage() {
  const res = await getDailyTodosAction();
  const todos = res.success && res.data ? res.data : [];

  return (
    <div className="space-y-6 p-4 pt-16 lg:pt-6 lg:p-8 min-h-screen bg-background">
      <div className="flex flex-col gap-1 mb-8">
        <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
          <ListTodo className="w-6 h-6 text-primary" /> My Daily Todos
        </h1>
        <p className="text-sm text-muted-foreground font-medium">
          Map out and manage your daily tasks independent of shipments.
        </p>
      </div>

      <TodoList initialTodos={todos} />
    </div>
  );
}
