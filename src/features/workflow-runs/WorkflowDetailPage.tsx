import { useParams } from "react-router-dom";
import { useState } from "react";
import { usePolling } from "@/hooks/usePolling";
import { useAsync } from "@/hooks/useAsync";
import { workflowApi } from "@/services/api/workflowApi";
import { testApi } from "@/services/api/testApi";
import { approvalApi } from "@/services/api/approvalApi";
import { evidenceApi } from "@/services/api/evidenceApi";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { OriginBadge } from "@/components/ui/OriginBadge";
import { WorkflowStepper } from "@/components/workflow/WorkflowStepper";
import { Loading, ErrorState } from "@/components/ui/Loading";
import { useToast } from "@/contexts/ToastContext";
import type { TestCase, Approval } from "@/types";

export function WorkflowDetailPage() {
  const { id = "" } = useParams();
  const { notify } = useToast();
  const [tick, setTick] = useState(0);

  const status = usePolling(() => workflowApi.status(id), 2500, true);
  const tests = useAsync(() => testApi.forWorkflow(id), [id, tick]);
  const approvals = useAsync(() => approvalApi.forWorkflow(id), [id, tick]);
  const evidence = useAsync(() => evidenceApi.forWorkflow(id), [id, tick]);

  const decide = async (a: Approval, decision: string) => {
    try {
      await approvalApi.decide(a.uuid, decision);
      notify("success", `${a.stage.replace(/_/g, " ")} ${decision.toLowerCase()}`);
      setTimeout(() => setTick((t) => t + 1), 400);
    } catch (e) {
      notify("error", (e as Error).message);
    }
  };

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-[var(--color-text-primary)]">Workflow</h1>
          <p className="font-mono text-xs text-[var(--color-text-secondary)]">{id}</p>
        </div>
        {status && <StatusBadge status={status.status} />}
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <Card>
          <h2 className="mb-4 font-display text-sm font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">Pipeline</h2>
          <WorkflowStepper current={status?.current_stage ?? "CREATED"} />
        </Card>

        <div className="flex flex-col gap-6">
          {/* Pending approvals */}
          {approvals.data?.approvals?.some((a) => a.decision === "PENDING") && (
            <Card style={{ borderColor: "var(--color-border-orange)" }}>
              <h2 className="mb-3 font-display text-base font-semibold text-[var(--color-text-primary)]">Human checkpoint</h2>
              {approvals.data.approvals.filter((a) => a.decision === "PENDING").map((a) => (
                <div key={a.uuid} className="flex items-center justify-between border-t border-[var(--color-border)] py-3 first:border-t-0">
                  <span className="text-sm text-[var(--color-text-primary)]">{a.stage.replace(/_/g, " ")}</span>
                  <div className="flex gap-2">
                    <Button variant="secondary" onClick={() => decide(a, "REJECTED")}>Reject</Button>
                    <Button onClick={() => decide(a, "APPROVED")}>Approve</Button>
                  </div>
                </div>
              ))}
            </Card>
          )}

          {/* Test cases */}
          <Card>
            <h2 className="mb-3 font-display text-base font-semibold text-[var(--color-text-primary)]">Test Cases</h2>
            {tests.loading ? <Loading /> : tests.error ? <ErrorState message={tests.error} onRetry={tests.reload} /> : (
              <div className="flex flex-col gap-2">
                {(tests.data?.test_cases ?? []).map((t: TestCase) => (
                  <div key={t.uuid} className="flex items-center justify-between rounded-[10px] border border-[var(--color-border)] px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-[var(--color-primary)]">{t.test_key}</span>
                      <span className="text-sm text-[var(--color-text-primary)]">{t.title}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <OriginBadge origin={t.origin} />
                      <StatusBadge status={t.status} />
                    </div>
                  </div>
                ))}
                {(!tests.data?.test_cases || tests.data.test_cases.length === 0) &&
                  <p className="text-sm text-[var(--color-text-secondary)]">No tests generated yet.</p>}
              </div>
            )}
          </Card>

          {/* Evidence */}
          <Card>
            <h2 className="mb-3 font-display text-base font-semibold text-[var(--color-text-primary)]">Evidence</h2>
            {(evidence.data?.evidence as { uuid: string; evidence_key: string; approval_status: string; checksum: string }[] ?? []).map((e) => (
              <div key={e.uuid} className="flex items-center justify-between rounded-[10px] border border-[var(--color-border)] px-3 py-2">
                <div>
                  <p className="font-mono text-xs text-[var(--color-primary)]">{e.evidence_key}</p>
                  <p className="font-mono text-[10px] text-[var(--color-text-secondary)]">sha256 {e.checksum?.slice(0, 16)}…</p>
                </div>
                <StatusBadge status={e.approval_status} />
              </div>
            ))}
            {(!evidence.data?.evidence || (evidence.data.evidence as unknown[]).length === 0) &&
              <p className="text-sm text-[var(--color-text-secondary)]">Evidence appears after execution and validation.</p>}
          </Card>
        </div>
      </div>
    </div>
  );
}
