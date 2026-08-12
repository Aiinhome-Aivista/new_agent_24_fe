export function Loading({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-14 text-sm text-[var(--color-text-secondary)]">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--color-primary)] border-t-transparent" />
      {label}…
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="surface flex flex-col items-center gap-3 py-12 text-center">
      <p className="text-sm text-[var(--color-error)]">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="text-sm font-medium text-[var(--color-primary)] hover:underline">
          Try again
        </button>
      )}
    </div>
  );
}
