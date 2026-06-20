// src/components/ui/EmptyState.tsx
import { ReactNode } from "react";
interface EmptyStateProps {
  title: string;
  description: string;
  icon?: ReactNode;
}

export function EmptyState({ title, description, icon }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
      {icon && <div className="mb-4 text-slate-400">{icon}</div>}
      <h3 className="font-semibold text-slate-800 text-base">{title}</h3>
      <p className="text-sm text-slate-500 mt-1 max-w-sm">{description}</p>
    </div>
  );
}
