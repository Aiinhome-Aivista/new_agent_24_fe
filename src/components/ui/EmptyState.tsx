import { ReactNode } from "react";

export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="surface flex flex-col items-center justify-center gap-2 py-14 text-center">
      <p className="font-display text-lg text-[var(--color-text-primary)]">{title}</p>
      {hint && <p className="max-w-sm text-sm text-[var(--color-text-secondary)]">{hint}</p>}
      {action}
    </div>
  );
}
