import { useParams, useSearchParams, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { usePolling } from "@/hooks/usePolling";
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
import type { TestCase, Approval, WorkflowRun } from "@/types";
import {
  ShieldAlert,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Clock,
  UserCheck,
  ArrowLeft,
  RefreshCw,
  FileCheck2,
  FlaskConical,
  MessageSquare,
  Sparkles,
} from "lucide-react";

const CHECKPOINT_GUIDES: Record<string, { title: string; desc: string }> = {
  TEST_REVIEW: {
    title: "Stage 6 · Test Suite Review & Sign-Off",
    desc: "The autonomous agent has analyzed user story acceptance criteria and generated the test suite. Review test cases and mock contracts before authorizing code generation.",
  },
  EVIDENCE_REVIEW: {
    title: "Stage 12 · Execution Evidence Review",
    desc: "Test execution logs, runtime assertion outputs, and deterministic evidence have been generated. Review evidence artifacts before authorizing ALM sync.",
  },
  ALM_APPROVAL: {
    title: "Stage 13 · ALM Write-Back Authorization",
    desc: "Authorize sync & write-back of test cases and verified evidence to Enterprise ALM (Jira / Xray / Zephyr).",
  },
  ALM_ATTACHMENT: {
    title: "Stage 13 · ALM Write-Back Authorization",
    desc: "Authorize sync & write-back of test cases and verified evidence to Enterprise ALM (Jira / Xray / Zephyr).",
  },
};

const QUICK_COMMENTS = [
  "Approved — looks solid",
  "Approved — verified against AC",
  "Request changes — add negative edge cases",
  "Request changes — update response payload schema",
];

export function WorkflowDetailPage() {
  const { id = "" } = useParams();
  const [params] = useSearchParams();
  const { notify } = useToast();

  const [workflowDetail, setWorkflowDetail] = useState<WorkflowRun | null>(null);
  const [tests, setTests] = useState<TestCase[]>([]);
  const [evidenceList, setEvidenceList] = useState<unknown[]>([]);
  const [approvalsList, setApprovalsList] = useState<Approval[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Decision state per approval
  const [comments, setComments] = useState<Record<string, string>>({});
  const [submittingUuid, setSubmittingUuid] = useState<string | null>(null);

  // Poll workflow status continuously every 2 seconds
  const status = usePolling(() => workflowApi.status(id), 2000, true);

  // Fetch all workflow data
  const refreshData = async () => {
    try {
      const [dRes, tRes, aRes, eRes] = await Promise.all([
        workflowApi.detail(id),
        testApi.forWorkflow(id),
        approvalApi.forWorkflow(id),
        evidenceApi.forWorkflow(id),
      ]);
      setWorkflowDetail(dRes.workflow);
      setTests(tRes.test_cases ?? []);
      setApprovalsList(aRes.approvals ?? []);
      setEvidenceList(eRes.evidence ?? []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoadingInitial(false);
    }
  };

  // Initial load
  useEffect(() => {
    refreshData();
  }, [id]);

  // Re-fetch tests, evidence, approvals when polling status changes stage or status
  useEffect(() => {
    if (status) {
      refreshData();
    }
  }, [status?.current_stage, status?.status]);

  // Determine active project uuid from search params or fetched workflow
  const activeProjUuid =
    params.get("project") ||
    status?.project_uuid ||
    workflowDetail?.project_uuid ||
    "";

  const handleDecide = async (a: Approval, decision: string) => {
    setSubmittingUuid(a.uuid);
    const comment = comments[a.uuid] || "";
    try {
      await approvalApi.decide(a.uuid, decision, comment);
      const stageName = a.stage.replace(/_/g, " ");
      if (decision === "APPROVED") {
        notify("success", `Approved: ${stageName} — pipeline continuing.`);
      } else if (decision === "CHANGES_REQUESTED") {
        notify("warning", `Changes requested on ${stageName}.`);
      } else {
        notify("info", `Rejected: ${stageName}.`);
      }

      // Clear comment for this approval
      setComments((prev) => {
        const next = { ...prev };
        delete next[a.uuid];
        return next;
      });

      // Immediate refresh
      await refreshData();
    } catch (e) {
      notify("error", (e as Error).message);
    } finally {
      setSubmittingUuid(null);
    }
  };

  if (loadingInitial && !workflowDetail) return <Loading />;
  if (error && !workflowDetail) return <ErrorState message={error} onRetry={refreshData} />;

  const pendingApprovals = approvalsList.filter((a) => a.decision === "PENDING");
  const pastApprovals = approvalsList.filter((a) => a.decision !== "PENDING");

  const currentStage = status?.current_stage || workflowDetail?.current_stage || "CREATED";
  const currentStatus = status?.status || workflowDetail?.status || "RUNNING";

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Navigation Breadcrumb */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          to={`/app/workflows${activeProjUuid ? `?project=${activeProjUuid}` : ""}`}
          className="flex items-center gap-1.5 text-xs font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors"
        >
          <ArrowLeft size={14} />
          <span>Back to Workflow Runs</span>
        </Link>

        <Button
          variant="secondary"
          onClick={refreshData}
          className="flex items-center gap-1 text-xs py-1.5 px-3"
        >
          <RefreshCw size={13} /> Refresh
        </Button>
      </div>

      {/* Workflow Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            {workflowDetail?.story_key && (
              <span className="rounded bg-[var(--color-primary)]/10 px-2 py-0.5 font-mono text-xs font-bold text-[var(--color-primary)]">
                {workflowDetail.story_key}
              </span>
            )}
            {workflowDetail?.project_key && (
              <span className="rounded border border-[var(--color-border)] px-1.5 py-0.5 font-mono text-xs text-[var(--color-text-secondary)]">
                {workflowDetail.project_key}
              </span>
            )}
            <h1 className="font-display text-xl font-bold text-[var(--color-text-primary)]">
              {workflowDetail?.story_title || `TDD Workflow Run`}
            </h1>
          </div>
          <p className="font-mono text-xs text-[var(--color-text-secondary)]">
            Run ID: <span className="text-[var(--color-text-primary)]">{id}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <StatusBadge status={currentStatus} />
        </div>
      </div>

      {/* Main Grid: Stepper on Left, Workflow Content on Right */}
      <div className="grid gap-6 lg:grid-cols-[290px_1fr]">
        {/* Pipeline Stepper Column */}
        <Card className="h-fit sticky top-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
              TDD Pipeline Execution
            </h2>
            <span className="rounded bg-[var(--color-surface-elevated)] px-2 py-0.5 text-[10px] font-mono text-[var(--color-primary)]">
              15 Stages
            </span>
          </div>
          <WorkflowStepper current={currentStage} status={currentStatus} />
        </Card>

        {/* Content Column */}
        <div className="flex flex-col gap-6">
          {/* PENDING HUMAN CHECKPOINT CARD */}
          {pendingApprovals.length > 0 && (
            <div className="rounded-2xl border-2 border-amber-500 bg-amber-500/5 p-5 shadow-lg shadow-amber-500/5 space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400">
                  <ShieldAlert size={20} className="animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-display text-base font-bold text-[var(--color-text-primary)]">
                      Human Governance Checkpoint
                    </h2>
                    <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-400">
                      Authorization Required
                    </span>
                  </div>
                  <p className="text-xs text-[var(--color-text-secondary)]">
                    Autonomous execution has halted. Human approval is required to advance this workflow.
                  </p>
                </div>
              </div>

              {pendingApprovals.map((a) => {
                const guide = CHECKPOINT_GUIDES[a.stage] || {
                  title: a.stage.replace(/_/g, " "),
                  desc: "Review pipeline outputs before granting authorization to proceed.",
                };
                const commentVal = comments[a.uuid] || "";
                const isSubmitting = submittingUuid === a.uuid;

                return (
                  <div
                    key={a.uuid}
                    className="rounded-xl border border-amber-500/30 bg-[var(--color-surface)] p-4 space-y-3.5"
                  >
                    <div>
                      <h3 className="font-display text-sm font-semibold text-[var(--color-text-primary)]">
                        {guide.title}
                      </h3>
                      <p className="text-xs text-[var(--color-text-secondary)] mt-0.5 leading-relaxed">
                        {guide.desc}
                      </p>
                    </div>

                    {/* Summary Context */}
                    <div className="flex flex-wrap gap-4 rounded-lg bg-[var(--color-surface-elevated)] p-2.5 text-xs text-[var(--color-text-secondary)]">
                      <span>
                        Generated Test Cases: <strong className="text-[var(--color-text-primary)]">{tests.length}</strong>
                      </span>
                      <span>·</span>
                      <span>
                        Evidence Artifacts: <strong className="text-[var(--color-text-primary)]">{evidenceList.length}</strong>
                      </span>
                      <span>·</span>
                      <span>
                        Requested: <strong className="text-[var(--color-text-primary)]">{new Date(a.requested_at).toLocaleTimeString()}</strong>
                      </span>
                    </div>

                    {/* Reviewer Note / Comment Input */}
                    <div className="space-y-1.5">
                      <label className="flex items-center gap-1 text-xs font-medium text-[var(--color-text-secondary)]">
                        <MessageSquare size={13} />
                        <span>Reviewer Note / Feedback (Optional):</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Leave feedback or reason for approval/changes..."
                        value={commentVal}
                        onChange={(e) =>
                          setComments((prev) => ({ ...prev, [a.uuid]: e.target.value }))
                        }
                        className="w-full rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-2 text-xs text-[var(--color-text-primary)] focus:border-[var(--color-primary)] focus:outline-none"
                      />

                      {/* Quick Comment Chips */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {QUICK_COMMENTS.map((chip) => (
                          <button
                            key={chip}
                            type="button"
                            onClick={() =>
                              setComments((prev) => ({ ...prev, [a.uuid]: chip }))
                            }
                            className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-0.5 text-[10px] text-[var(--color-text-secondary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors"
                          >
                            {chip}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Decision Buttons */}
                    <div className="flex flex-wrap items-center justify-end gap-2.5 border-t border-[var(--color-border)] pt-3">
                      <Button
                        variant="secondary"
                        onClick={() => handleDecide(a, "REJECTED")}
                        disabled={isSubmitting}
                        className="flex items-center gap-1.5 text-xs text-red-400 hover:bg-red-500/10 hover:border-red-500/30"
                      >
                        <XCircle size={14} /> Reject
                      </Button>

                      <Button
                        variant="secondary"
                        onClick={() => handleDecide(a, "CHANGES_REQUESTED")}
                        disabled={isSubmitting}
                        className="flex items-center gap-1.5 text-xs text-amber-400 hover:bg-amber-500/10 hover:border-amber-500/30"
                      >
                        <RotateCcw size={14} /> Request Changes
                      </Button>

                      <Button
                        onClick={() => handleDecide(a, "APPROVED")}
                        loading={isSubmitting}
                        className="flex items-center gap-1.5 text-xs font-semibold"
                      >
                        <CheckCircle2 size={14} /> Approve & Continue Pipeline
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Test Cases Card */}
          <Card>
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FlaskConical size={18} className="text-[var(--color-primary)]" />
                <h2 className="font-display text-base font-semibold text-[var(--color-text-primary)]">
                  Generated Test Cases
                </h2>
              </div>
              <span className="rounded-full bg-[var(--color-primary)]/10 px-2 py-0.5 font-mono text-xs font-semibold text-[var(--color-primary)]">
                {tests.length} tests
              </span>
            </div>

            {tests.length === 0 ? (
              <p className="text-xs text-[var(--color-text-secondary)]">
                Tests will appear once the Test Generation stage executes.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {tests.map((t: TestCase) => (
                  <div
                    key={t.uuid}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface-elevated)]/30 p-3 hover:border-[var(--color-border-orange)]/60 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="rounded bg-[var(--color-primary)]/10 px-2 py-0.5 font-mono text-xs font-bold text-[var(--color-primary)]">
                        {t.test_key}
                      </span>
                      <span className="text-xs font-semibold text-[var(--color-text-primary)]">
                        {t.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {t.scenario_type && (
                        <span className="rounded border border-[var(--color-border)] px-1.5 py-0.5 text-[10px] font-mono text-[var(--color-text-secondary)]">
                          {t.scenario_type}
                        </span>
                      )}
                      <OriginBadge origin={t.origin} />
                      <StatusBadge status={t.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Evidence Artifacts Card */}
          <Card>
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCheck2 size={18} className="text-[var(--color-primary)]" />
                <h2 className="font-display text-base font-semibold text-[var(--color-text-primary)]">
                  Execution Evidence & Audit Proof
                </h2>
              </div>
              <span className="rounded-full bg-[var(--color-surface-elevated)] px-2 py-0.5 font-mono text-xs text-[var(--color-text-secondary)]">
                {evidenceList.length} artifact(s)
              </span>
            </div>

            {evidenceList.length === 0 ? (
              <p className="text-xs text-[var(--color-text-secondary)]">
                Deterministic evidence packages appear after execution, validation, and traceability stages.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {(
                  evidenceList as {
                    uuid: string;
                    evidence_key: string;
                    approval_status: string;
                    checksum: string;
                    format?: string;
                  }[]
                ).map((e) => (
                  <div
                    key={e.uuid}
                    className="flex items-center justify-between rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface-elevated)]/30 p-3"
                  >
                    <div>
                      <p className="font-mono text-xs font-bold text-[var(--color-primary)]">
                        {e.evidence_key}
                      </p>
                      <p className="font-mono text-[10px] text-[var(--color-text-secondary)]">
                        sha256 {e.checksum?.slice(0, 24)}…
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {e.format && (
                        <span className="rounded bg-[var(--color-surface-elevated)] px-1.5 py-0.5 text-[10px] font-mono text-[var(--color-text-secondary)]">
                          {e.format.toUpperCase()}
                        </span>
                      )}
                      <StatusBadge status={e.approval_status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Governance & Audit Trail History */}
          {pastApprovals.length > 0 && (
            <Card>
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserCheck size={18} className="text-[var(--color-primary)]" />
                  <h2 className="font-display text-base font-semibold text-[var(--color-text-primary)]">
                    Governance Checkpoint Audit History
                  </h2>
                </div>
                <span className="text-xs text-[var(--color-text-secondary)]">
                  {pastApprovals.length} recorded decision(s)
                </span>
              </div>

              <div className="divide-y divide-[var(--color-border)]">
                {pastApprovals.map((pa) => (
                  <div key={pa.uuid} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-semibold text-[var(--color-text-primary)]">
                        {pa.stage.replace(/_/g, " ")}
                      </p>
                      {pa.comment && (
                        <p className="text-[11px] text-[var(--color-text-secondary)] italic mt-0.5">
                          "{pa.comment}"
                        </p>
                      )}
                      <p className="text-[10px] text-[var(--color-text-secondary)] mt-0.5">
                        {pa.approver_name ? `Approved by ${pa.approver_name} · ` : ""}
                        {pa.decided_at ? new Date(pa.decided_at).toLocaleString() : ""}
                      </p>
                    </div>
                    <StatusBadge status={pa.decision} />
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
