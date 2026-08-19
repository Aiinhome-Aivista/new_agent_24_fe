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
import type {
  TestCase,
  Approval,
  WorkflowRun,
  ExecutionRun,
  CodeQualityRun,
  EvidencePackage,
} from "@/types";
import {
  ShieldAlert,
  CheckCircle2,
  XCircle,
  RotateCcw,
  UserCheck,
  ArrowLeft,
  RefreshCw,
  FileCheck2,
  FlaskConical,
  MessageSquare,
  Zap,
  ShieldCheck,
  Code2,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Download,
  Terminal,
  Activity,
  AlertTriangle,
  FileText,
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
  const [evidenceList, setEvidenceList] = useState<EvidencePackage[]>([]);
  const [approvalsList, setApprovalsList] = useState<Approval[]>([]);
  const [executionRuns, setExecutionRuns] = useState<ExecutionRun[]>([]);
  const [codeQualityRuns, setCodeQualityRuns] = useState<CodeQualityRun[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active Tab
  const [activeTab, setActiveTab] = useState<"tests" | "executions" | "quality" | "evidence" | "history">("tests");

  // Expanded items state
  const [expandedTestUuid, setExpandedTestUuid] = useState<string | null>(null);
  const [expandedExecId, setExpandedExecId] = useState<number | null>(null);
  const [selectedEvidence, setSelectedEvidence] = useState<EvidencePackage | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Decision state per approval
  const [comments, setComments] = useState<Record<string, string>>({});
  const [submittingUuid, setSubmittingUuid] = useState<string | null>(null);

  // Smart polling: stop continuous polling once workflow is finished or blocked
  const isTerminal = ["COMPLETED", "FAILED", "CANCELLED", "BLOCKED"].includes(
    workflowDetail?.status || ""
  );
  const status = usePolling(() => workflowApi.status(id), 2500, !isTerminal);

  // Fetch all workflow data
  const refreshData = async () => {
    try {
      const [dRes, tRes, aRes, eRes, execRes, cqRes] = await Promise.all([
        workflowApi.detail(id),
        testApi.forWorkflow(id).catch(() => ({ test_cases: [] })),
        approvalApi.forWorkflow(id).catch(() => ({ approvals: [] })),
        evidenceApi.forWorkflow(id).catch(() => ({ evidence: [] })),
        testApi.executions(id).catch(() => ({ executions: [] })),
        testApi.codeQuality(id).catch(() => ({ code_quality: [] })),
      ]);
      setWorkflowDetail(dRes.workflow);
      setTests(tRes.test_cases ?? []);
      setApprovalsList(aRes.approvals ?? []);
      setEvidenceList((eRes.evidence as EvidencePackage[]) ?? []);
      setExecutionRuns(execRes.executions ?? []);
      setCodeQualityRuns(cqRes.code_quality ?? []);
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

  // Re-fetch data when polling status changes
  useEffect(() => {
    if (status) {
      refreshData();
    }
  }, [status?.current_stage, status?.status]);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    notify("success", "Copied to clipboard!");
    setTimeout(() => setCopiedKey(null), 2000);
  };

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

      setComments((prev) => {
        const next = { ...prev };
        delete next[a.uuid];
        return next;
      });

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

  const latestExec = executionRuns[0];
  const latestQuality = codeQualityRuns[0];

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

          {/* Interactive Navigation Tabs */}
          <div className="flex flex-wrap items-center gap-2 border-b border-[var(--color-border)] pb-2">
            <button
              type="button"
              onClick={() => setActiveTab("tests")}
              className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
                activeTab === "tests"
                  ? "bg-[var(--color-primary)] text-white shadow-md shadow-[var(--color-primary)]/20"
                  : "bg-[var(--color-surface-elevated)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              <FlaskConical size={14} />
              <span>Generated Tests</span>
              <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                activeTab === "tests" ? "bg-white/20 text-white" : "bg-[var(--color-surface)] text-[var(--color-text-secondary)]"
              }`}>
                {tests.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("executions")}
              className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
                activeTab === "executions"
                  ? "bg-[var(--color-primary)] text-white shadow-md shadow-[var(--color-primary)]/20"
                  : "bg-[var(--color-surface-elevated)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              <Zap size={14} />
              <span>API Execution Results</span>
              {latestExec && (
                <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                  latestExec.failed === 0 ? "bg-emerald-500/20 text-emerald-300" : "bg-red-500/20 text-red-300"
                }`}>
                  {latestExec.passed}/{latestExec.total}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("quality")}
              className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
                activeTab === "quality"
                  ? "bg-[var(--color-primary)] text-white shadow-md shadow-[var(--color-primary)]/20"
                  : "bg-[var(--color-surface-elevated)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              <ShieldCheck size={14} />
              <span>Code Quality</span>
              {latestQuality && (
                <span className="rounded-full bg-blue-500/20 px-1.5 py-0.2 text-[10px] font-bold text-blue-300">
                  {latestQuality.score}%
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("evidence")}
              className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
                activeTab === "evidence"
                  ? "bg-[var(--color-primary)] text-white shadow-md shadow-[var(--color-primary)]/20"
                  : "bg-[var(--color-surface-elevated)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              <FileCheck2 size={14} />
              <span>Audit Evidence</span>
              <span className="rounded-full bg-[var(--color-surface)] px-1.5 py-0.2 text-[10px] font-bold text-[var(--color-text-secondary)]">
                {evidenceList.length}
              </span>
            </button>

            {pastApprovals.length > 0 && (
              <button
                type="button"
                onClick={() => setActiveTab("history")}
                className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
                  activeTab === "history"
                    ? "bg-[var(--color-primary)] text-white shadow-md shadow-[var(--color-primary)]/20"
                    : "bg-[var(--color-surface-elevated)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                }`}
              >
                <UserCheck size={14} />
                <span>Governance History</span>
                <span className="rounded-full bg-[var(--color-surface)] px-1.5 py-0.2 text-[10px] font-bold text-[var(--color-text-secondary)]">
                  {pastApprovals.length}
                </span>
              </button>
            )}
          </div>

          {/* TAB 1: GENERATED TEST CASES & CODE */}
          {activeTab === "tests" && (
            <Card>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="font-display text-base font-bold text-[var(--color-text-primary)]">
                    Generated Test Cases & Executable Code
                  </h2>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                    Structured test scenarios decomposed by Gemini LLM from story acceptance criteria.
                  </p>
                </div>
                <span className="rounded-full bg-[var(--color-primary)]/10 px-2.5 py-1 font-mono text-xs font-bold text-[var(--color-primary)]">
                  {tests.length} Total Tests
                </span>
              </div>

              {tests.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[var(--color-border)] p-8 text-center">
                  <FlaskConical size={32} className="mx-auto text-[var(--color-text-secondary)]/40 mb-2" />
                  <p className="text-xs font-medium text-[var(--color-text-secondary)]">
                    No test cases generated yet. Test cases will appear once Stage 5 (Test Generation) executes.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {tests.map((t: TestCase) => {
                    const isExpanded = expandedTestUuid === t.uuid;
                    const scenarioTypeBadgeColor =
                      t.scenario_type === "positive"
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : t.scenario_type === "negative"
                        ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                        : t.scenario_type === "boundary"
                        ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                        : "bg-blue-500/10 text-blue-400 border-blue-500/20";

                    return (
                      <div
                        key={t.uuid}
                        className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden transition-all hover:border-[var(--color-primary)]/40"
                      >
                        {/* Test Header / Summary Row */}
                        <div
                          onClick={() => setExpandedTestUuid(isExpanded ? null : t.uuid)}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 cursor-pointer hover:bg-[var(--color-surface-elevated)]/40"
                        >
                          <div className="flex items-center gap-3">
                            <span className="rounded-lg bg-[var(--color-primary)]/10 px-2.5 py-1 font-mono text-xs font-bold text-[var(--color-primary)]">
                              {t.test_key}
                            </span>
                            <div>
                              <h3 className="text-xs font-semibold text-[var(--color-text-primary)]">
                                {t.title}
                              </h3>
                              {t.description && t.description !== t.title && (
                                <p className="text-[11px] text-[var(--color-text-secondary)] mt-0.5 line-clamp-1">
                                  {t.description}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {t.scenario_type && (
                              <span className={`rounded-md border px-2 py-0.5 text-[10px] font-mono uppercase font-semibold ${scenarioTypeBadgeColor}`}>
                                {t.scenario_type}
                              </span>
                            )}
                            <OriginBadge origin={t.origin} />
                            <StatusBadge status={t.status} />
                            <button
                              type="button"
                              className="p-1 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                            >
                              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </button>
                          </div>
                        </div>

                        {/* Expandable Test Details & Code Block */}
                        {isExpanded && (
                          <div className="border-t border-[var(--color-border)] bg-[var(--color-surface-elevated)]/20 p-4 space-y-4">
                            {/* Metadata Grid */}
                            <div className="grid gap-3 sm:grid-cols-2 text-xs">
                              {t.expected_result && (
                                <div className="rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] p-3">
                                  <span className="font-semibold text-[var(--color-text-primary)] block mb-1">
                                    Expected Result:
                                  </span>
                                  <p className="text-[var(--color-text-secondary)] leading-relaxed">
                                    {t.expected_result}
                                  </p>
                                </div>
                              )}
                              <div className="rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] p-3 space-y-1.5">
                                <div className="flex items-center justify-between">
                                  <span className="text-[var(--color-text-secondary)]">Priority:</span>
                                  <span className="font-semibold uppercase text-xs text-[var(--color-text-primary)]">{t.priority}</span>
                                </div>
                                {t.target_language && (
                                  <div className="flex items-center justify-between">
                                    <span className="text-[var(--color-text-secondary)]">Target Tech:</span>
                                    <span className="font-mono text-[var(--color-primary)]">
                                      {t.target_language} · {t.framework || "JUnit5"}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Generated Code Display */}
                            {t.generated_code && (
                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                  <span className="flex items-center gap-1.5 text-xs font-semibold text-[var(--color-text-primary)]">
                                    <Code2 size={14} className="text-[var(--color-primary)]" />
                                    Executable Test Code ({t.target_language || "Java"}):
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleCopy(t.generated_code || "", t.uuid)}
                                    className="flex items-center gap-1 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-[11px] text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] hover:border-[var(--color-primary)] transition-colors"
                                  >
                                    {copiedKey === t.uuid ? (
                                      <>
                                        <Check size={12} className="text-emerald-400" />
                                        <span className="text-emerald-400">Copied</span>
                                      </>
                                    ) : (
                                      <>
                                        <Copy size={12} />
                                        <span>Copy Code</span>
                                      </>
                                    )}
                                  </button>
                                </div>
                                <pre className="rounded-xl border border-[var(--color-border)] bg-[#0d1117] p-4 text-xs font-mono text-emerald-400 overflow-x-auto leading-relaxed shadow-inner max-h-96">
                                  <code>{t.generated_code}</code>
                                </pre>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          )}

          {/* TAB 2: API EXECUTION RESULTS */}
          {activeTab === "executions" && (
            <Card>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="font-display text-base font-bold text-[var(--color-text-primary)]">
                    API Execution Results & Runtime Verifications
                  </h2>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                    Deterministic HTTP test execution runs against target services with status codes and assertion details.
                  </p>
                </div>
              </div>

              {executionRuns.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[var(--color-border)] p-8 text-center">
                  <Zap size={32} className="mx-auto text-[var(--color-text-secondary)]/40 mb-2" />
                  <p className="text-xs font-medium text-[var(--color-text-secondary)]">
                    No execution results yet. The API Executor stage runs after human review is approved.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {executionRuns.map((exec) => {
                    const passRate = exec.total > 0 ? Math.round((exec.passed / exec.total) * 100) : 0;
                    return (
                      <div key={exec.uuid} className="space-y-4">
                        {/* Execution Summary KPI Bar */}
                        <div className="grid gap-3 sm:grid-cols-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)]/40 p-4">
                          <div>
                            <span className="text-[10px] uppercase tracking-wider text-[var(--color-text-secondary)]">Runner Mode</span>
                            <p className="text-sm font-bold font-mono text-[var(--color-primary)]">
                              {exec.runner.toUpperCase()} {exec.is_mock ? "(SIMULATED)" : "(LIVE)"}
                            </p>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase tracking-wider text-[var(--color-text-secondary)]">Pass Rate</span>
                            <p className={`text-sm font-bold ${passRate === 100 ? "text-emerald-400" : "text-amber-400"}`}>
                              {passRate}% ({exec.passed}/{exec.total})
                            </p>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase tracking-wider text-[var(--color-text-secondary)]">Failed Tests</span>
                            <p className={`text-sm font-bold ${exec.failed === 0 ? "text-emerald-400" : "text-red-400"}`}>
                              {exec.failed} Failed
                            </p>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase tracking-wider text-[var(--color-text-secondary)]">Status</span>
                            <div className="mt-0.5">
                              <StatusBadge status={exec.status} />
                            </div>
                          </div>
                        </div>

                        {/* Results list */}
                        <div className="space-y-2">
                          <h3 className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
                            Executed Endpoints ({exec.results?.length || 0})
                          </h3>

                          {(exec.results || []).map((res) => {
                            const isExpanded = expandedExecId === res.id;
                            const isSuccess = Boolean(res.passed);
                            const statusCodeColor =
                              res.status_code >= 200 && res.status_code < 300
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                                : res.status_code >= 400 && res.status_code < 500
                                ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                                : "bg-red-500/10 text-red-400 border-red-500/30";

                            return (
                              <div
                                key={res.id}
                                className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden transition-all hover:border-[var(--color-primary)]/40"
                              >
                                <div
                                  onClick={() => setExpandedExecId(isExpanded ? null : res.id)}
                                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 cursor-pointer hover:bg-[var(--color-surface-elevated)]/30"
                                >
                                  <div className="flex items-center gap-3">
                                    <span className={`rounded-md border px-2 py-0.5 font-mono text-xs font-bold ${statusCodeColor}`}>
                                      {res.status_code || "---"}
                                    </span>
                                    <div className="flex items-center gap-2">
                                      <span className="rounded bg-[var(--color-surface-elevated)] px-1.5 py-0.5 font-mono text-[10px] font-bold text-[var(--color-text-primary)]">
                                        {res.method || "POST"}
                                      </span>
                                      <span className="font-mono text-xs font-semibold text-[var(--color-text-primary)]">
                                        {res.url || "/api/endpoint"}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-3 shrink-0">
                                    {res.duration_ms !== undefined && (
                                      <span className="font-mono text-xs text-[var(--color-text-secondary)]">
                                        {res.duration_ms} ms
                                      </span>
                                    )}
                                    <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                                      isSuccess ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                                    }`}>
                                      {isSuccess ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
                                      {isSuccess ? "Passed" : "Failed"}
                                    </span>
                                    <button type="button" className="text-[var(--color-text-secondary)]">
                                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                    </button>
                                  </div>
                                </div>

                                {isExpanded && (
                                  <div className="border-t border-[var(--color-border)] bg-[var(--color-surface-elevated)]/20 p-4 space-y-3 text-xs font-mono">
                                    {/* Assertions */}
                                    {res.assertions && res.assertions.length > 0 && (
                                      <div>
                                        <span className="text-[var(--color-text-secondary)] font-sans font-semibold block mb-1.5">
                                          Assertions:
                                        </span>
                                        <div className="space-y-1">
                                          {res.assertions.map((a, i) => (
                                            <div key={i} className="flex items-center gap-2 text-xs">
                                              {a.passed ? (
                                                <CheckCircle2 size={13} className="text-emerald-400" />
                                              ) : (
                                                <XCircle size={13} className="text-red-400" />
                                              )}
                                              <span className={a.passed ? "text-emerald-300" : "text-red-300"}>
                                                {a.name}
                                              </span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {/* Raw Response Payload */}
                                    {res.resp_body && (
                                      <div>
                                        <span className="text-[var(--color-text-secondary)] font-sans font-semibold block mb-1">
                                          Response Payload:
                                        </span>
                                        <pre className="rounded-lg bg-[#0d1117] p-3 text-[11px] text-cyan-300 overflow-x-auto">
                                          {(() => {
                                            try {
                                              return JSON.stringify(JSON.parse(res.resp_body), null, 2);
                                            } catch {
                                              return res.resp_body;
                                            }
                                          })()}
                                        </pre>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          )}

          {/* TAB 3: CODE QUALITY */}
          {activeTab === "quality" && (
            <Card>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="font-display text-base font-bold text-[var(--color-text-primary)]">
                    Code Quality & Static Analysis Score
                  </h2>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                    Automated static analysis metrics, linting rules, and remediation recommendations.
                  </p>
                </div>
              </div>

              {codeQualityRuns.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[var(--color-border)] p-8 text-center">
                  <ShieldCheck size={32} className="mx-auto text-[var(--color-text-secondary)]/40 mb-2" />
                  <p className="text-xs font-medium text-[var(--color-text-secondary)]">
                    No code quality analysis recorded yet. Runs during Stage 9 (Code Validation).
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {codeQualityRuns.map((cq) => (
                    <div key={cq.uuid} className="space-y-4">
                      {/* Quality Score Header */}
                      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)]/40 p-5">
                        <div className="flex items-center gap-4">
                          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-xl font-bold font-mono">
                            {Math.round(cq.score)}%
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-display text-base font-bold text-[var(--color-text-primary)]">
                                Static Analysis {cq.passed ? "Passed" : "Failed"}
                              </h3>
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                                cq.passed ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
                              }`}>
                                {cq.passed ? "PASS" : "FAIL"}
                              </span>
                            </div>
                            <p className="text-xs text-[var(--color-text-secondary)] font-mono mt-0.5">
                              Analyzer Engine: <strong className="text-[var(--color-text-primary)]">{cq.analyzer.toUpperCase()}</strong>
                              {cq.is_mock ? " (SIMULATED)" : ""}
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-xs text-[var(--color-text-secondary)]">Total Issues Detected</span>
                          <p className="text-lg font-bold text-[var(--color-text-primary)]">
                            {cq.issues?.length || 0}
                          </p>
                        </div>
                      </div>

                      {/* Issues List */}
                      {cq.issues && cq.issues.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
                            Findings & Remediations ({cq.issues.length})
                          </h4>
                          {cq.issues.map((issue, idx) => (
                            <div
                              key={idx}
                              className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 space-y-2"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <span className="rounded bg-amber-500/20 text-amber-400 px-2 py-0.5 text-[10px] font-bold uppercase">
                                    {issue.severity}
                                  </span>
                                  <span className="font-mono text-xs font-semibold text-[var(--color-text-primary)]">
                                    {issue.rule}
                                  </span>
                                </div>
                                <span className="font-mono text-xs text-[var(--color-text-secondary)]">
                                  {issue.file}:{issue.line}
                                </span>
                              </div>
                              <p className="text-xs text-[var(--color-text-secondary)]">
                                {issue.description}
                              </p>
                              {issue.remediation && (
                                <div className="rounded-lg bg-[var(--color-surface-elevated)] p-2.5 text-xs text-emerald-400 font-mono">
                                  💡 Remediation: {issue.remediation}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          {/* TAB 4: AUDIT EVIDENCE ARTIFACTS */}
          {activeTab === "evidence" && (
            <Card>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="font-display text-base font-bold text-[var(--color-text-primary)]">
                    Execution Evidence & Audit Proof
                  </h2>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                    Immutable, SHA256-signed test evidence markdown documents ready for regulatory audit.
                  </p>
                </div>
                <span className="rounded-full bg-[var(--color-surface-elevated)] px-2.5 py-1 font-mono text-xs text-[var(--color-text-secondary)]">
                  {evidenceList.length} Artifact(s)
                </span>
              </div>

              {evidenceList.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[var(--color-border)] p-8 text-center">
                  <FileCheck2 size={32} className="mx-auto text-[var(--color-text-secondary)]/40 mb-2" />
                  <p className="text-xs font-medium text-[var(--color-text-secondary)]">
                    Deterministic evidence packages appear after execution, validation, and traceability stages.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {evidenceList.map((e) => (
                    <div
                      key={e.uuid}
                      className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 hover:border-[var(--color-primary)]/40 transition-colors"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-mono text-sm font-bold text-[var(--color-primary)]">
                              {e.evidence_key}
                            </p>
                            <span className="rounded bg-[var(--color-surface-elevated)] px-1.5 py-0.5 text-[10px] font-mono text-[var(--color-text-secondary)]">
                              {(e.format || "MD").toUpperCase()}
                            </span>
                            <StatusBadge status={e.approval_status} />
                          </div>
                          <p className="font-mono text-[11px] text-[var(--color-text-secondary)] mt-1">
                            SHA-256: <span className="text-[var(--color-text-primary)]">{e.checksum || "Verified"}</span>
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            variant="secondary"
                            onClick={() => setSelectedEvidence(e)}
                            className="flex items-center gap-1.5 text-xs py-1.5 px-3 font-semibold"
                          >
                            <FileText size={14} /> View Markdown Evidence
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          {/* TAB 5: GOVERNANCE & AUDIT TRAIL HISTORY */}
          {activeTab === "history" && pastApprovals.length > 0 && (
            <Card>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="font-display text-base font-bold text-[var(--color-text-primary)]">
                    Governance Checkpoint Audit History
                  </h2>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                    Immutable history of human reviewer decisions and authorization comments.
                  </p>
                </div>
                <span className="text-xs font-semibold text-[var(--color-text-secondary)]">
                  {pastApprovals.length} Decision(s)
                </span>
              </div>

              <div className="divide-y divide-[var(--color-border)]">
                {pastApprovals.map((pa) => (
                  <div key={pa.uuid} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-semibold text-[var(--color-text-primary)] text-sm">
                        {pa.stage.replace(/_/g, " ")}
                      </p>
                      {pa.comment && (
                        <p className="text-xs text-[var(--color-text-secondary)] italic mt-1 bg-[var(--color-surface-elevated)] p-2 rounded-lg inline-block">
                          "{pa.comment}"
                        </p>
                      )}
                      <p className="text-[11px] text-[var(--color-text-secondary)] mt-1">
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

      {/* EVIDENCE MARKDOWN VIEWER MODAL */}
      {selectedEvidence && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-3xl rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-2xl flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-4 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                  <FileText size={20} />
                </div>
                <div>
                  <h3 className="font-display text-base font-bold text-[var(--color-text-primary)]">
                    {selectedEvidence.evidence_key}
                  </h3>
                  <p className="text-[11px] font-mono text-[var(--color-text-secondary)]">
                    SHA-256: {selectedEvidence.checksum}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  onClick={() =>
                    handleCopy(
                      selectedEvidence.content || selectedEvidence.narrative || "",
                      "modal-evid"
                    )
                  }
                  className="flex items-center gap-1.5 text-xs py-1.5 px-2.5"
                >
                  {copiedKey === "modal-evid" ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                  <span>{copiedKey === "modal-evid" ? "Copied" : "Copy Markdown"}</span>
                </Button>

                <Button
                  variant="secondary"
                  onClick={() => setSelectedEvidence(null)}
                  className="p-1.5 text-xs"
                >
                  <XCircle size={18} />
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto rounded-xl border border-[var(--color-border)] bg-[#0d1117] p-5 text-xs font-mono text-emerald-300 whitespace-pre-wrap leading-relaxed shadow-inner">
              {selectedEvidence.content || selectedEvidence.narrative || "# No evidence content available"}
            </div>

            <div className="mt-4 flex items-center justify-end">
              <Button onClick={() => setSelectedEvidence(null)} className="text-xs font-semibold">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

