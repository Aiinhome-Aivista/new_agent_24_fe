import { useState } from "react";
import { useAsync } from "@/hooks/useAsync";
import { approvalApi } from "@/services/api/approvalApi";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Loading, ErrorState } from "@/components/ui/Loading";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/contexts/ToastContext";
import { Link } from "react-router-dom";
import type { Approval } from "@/types";

export function ApprovalsPage() {
  const { notify } = useToast();
  const [tick, setTick] = useState(0);
  const { data, loading, error, reload } = useAsync(() => approvalApi.pending(), [tick]);

  const decide = async (a: Approval, decision: string) => {
    try {
      await approvalApi.decide(a.uuid, decision);
      notify("success", `${a.stage.replace(/_/g, " ")} ${decision.toLowerCase()}`);
      setTimeout(() => setTick((t) => t + 1), 300);
    } catch (e) {
      notify("error", (e as Error).message);
    }
  };

  if (loading) return <Loading />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  const approvals = data?.approvals ?? [];

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-1 font-display text-2xl font-semibold text-[var(--color-text-primary)]">Approval Center</h1>
      <p className="mb-6 text-sm text-[var(--color-text-secondary)]">Everything waiting for human action. Each decision creates an audit event.</p>
      {approvals.length === 0 ? (
        <EmptyState title="Nothing awaiting approval" hint="Human checkpoints will appear here as workflows reach them." />
      ) : (
        <div className="flex flex-col gap-2">
          {approvals.map((a) => (
            <Card key={a.uuid} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[var(--color-text-primary)]">{a.stage.replace(/_/g, " ")}</p>
                <Link to={`/app/workflows/${a.workflow_id}`} className="font-mono text-xs text-[var(--color-primary)] hover:underline">
                  {a.workflow_id.slice(0, 8)}…
                </Link>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => decide(a, "CHANGES_REQUESTED")}>Request changes</Button>
                <Button variant="secondary" onClick={() => decide(a, "REJECTED")}>Reject</Button>
                <Button onClick={() => decide(a, "APPROVED")}>Approve</Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
