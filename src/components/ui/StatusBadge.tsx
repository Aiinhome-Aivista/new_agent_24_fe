import { STATUS_TONE } from "@/constants/workflow";

const toneColor: Record<string, string> = {
  success: "var(--color-success)", warning: "var(--color-warning)",
  error: "var(--color-error)", info: "var(--color-info)",
};

export function StatusBadge({ status }: { status: string }) {
  const tone = STATUS_TONE[status] ?? "info";
  const color = toneColor[tone];
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
      style={{ color, backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)` }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
      {status.replace(/_/g, " ")}
    </span>
  );
}
