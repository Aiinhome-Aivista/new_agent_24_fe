import { useAsync } from "@/hooks/useAsync";
import { auditApi } from "@/services/api/auditApi";
import { Card } from "@/components/ui/Card";
import { Loading, ErrorState } from "@/components/ui/Loading";

export function AuditPage() {
  const events = useAsync(() => auditApi.events(), []);
  const guardrails = useAsync(() => auditApi.guardrails(), []);

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-6 font-display text-2xl font-semibold text-[var(--color-text-primary)]">Audit &amp; Guardrails</h1>

      <h2 className="mb-3 font-display text-base font-semibold text-[var(--color-text-primary)]">Audit trail</h2>
      {events.loading ? <Loading /> : events.error ? <ErrorState message={events.error} onRetry={events.reload} /> : (
        <Card className="mb-8 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">
                <th className="pb-2 pr-4">Event</th><th className="pb-2 pr-4">Agent</th>
                <th className="pb-2 pr-4">Status</th><th className="pb-2">Time</th>
              </tr>
            </thead>
            <tbody>
              {((events.data?.events as { event_id: string; event_type: string; agent?: string; status?: string; timestamp: string }[]) ?? []).slice(0, 25).map((e) => (
                <tr key={e.event_id} className="border-t border-[var(--color-border)]">
                  <td className="py-2 pr-4 font-mono text-xs text-[var(--color-text-primary)]">{e.event_type}</td>
                  <td className="py-2 pr-4 text-[var(--color-text-secondary)]">{e.agent ?? "—"}</td>
                  <td className="py-2 pr-4 text-[var(--color-text-secondary)]">{e.status ?? "—"}</td>
                  <td className="py-2 text-xs text-[var(--color-text-secondary)]">{String(e.timestamp).slice(0, 19).replace("T", " ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {(!events.data?.events || (events.data.events as unknown[]).length === 0) &&
            <p className="text-sm text-[var(--color-text-secondary)]">No audit events yet.</p>}
        </Card>
      )}

      <h2 className="mb-3 font-display text-base font-semibold text-[var(--color-text-primary)]">Guardrail events</h2>
      {guardrails.loading ? <Loading /> : (
        <Card>
          <div className="flex flex-col gap-1.5">
            {((guardrails.data?.events as { id: number; layer: string; rule: string; passed: number; detail?: string }[]) ?? []).slice(0, 20).map((g) => (
              <div key={g.id} className="flex items-center justify-between rounded-[8px] border border-[var(--color-border)] px-3 py-1.5 text-sm">
                <span className="text-[var(--color-text-primary)]">
                  <span className="font-mono text-xs text-[var(--color-primary)]">{g.layer}</span> · {g.rule}
                </span>
                <span className="text-xs" style={{ color: g.passed ? "var(--color-success)" : "var(--color-error)" }}>
                  {g.passed ? "PASS" : "BLOCKED"}
                </span>
              </div>
            ))}
            {(!guardrails.data?.events || (guardrails.data.events as unknown[]).length === 0) &&
              <p className="text-sm text-[var(--color-text-secondary)]">No guardrail events yet.</p>}
          </div>
        </Card>
      )}
    </div>
  );
}
