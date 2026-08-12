/** Makes the AI-vs-human provenance explicit, per the product's core principle. */
export function OriginBadge({ origin }: { origin: string }) {
  const isAi = origin === "AI_GENERATED";
  const color = isAi ? "var(--color-info)" : "var(--color-success)";
  return (
    <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
      style={{ color, backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)` }}>
      {isAi ? "AI Generated" : origin.replace(/_/g, " ")}
    </span>
  );
}
