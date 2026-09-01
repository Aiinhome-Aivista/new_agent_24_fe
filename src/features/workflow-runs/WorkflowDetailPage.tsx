import { useParams, useSearchParams, Link } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
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
  WorkflowSLA,
  AlmPreview,
  CodeLog,
  CoverageMatrixItem,
  GenerationSummary,
  ContractGap,
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
  FileCode,
  Gauge,
  BarChart3,
  Timer,
  Coins,
  Cpu,
  Layers,
  Printer,
  ExternalLink,
  Target,
  ArrowRight,
} from "lucide-react";

const CHECKPOINT_GUIDES: Record<string, { title: string; desc: string }> = {
  TEST_PLAN_REVIEW: {
    title: "Stage 4 · Test Plan & API Contract Review",
    desc: "Review missing functions or endpoints detected between the planned API contracts and the provided user story or Postman collection.",
  },
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
  const [coverageMatrix, setCoverageMatrix] = useState<CoverageMatrixItem[]>([]);
  const [generationSummary, setGenerationSummary] = useState<GenerationSummary | null>(null);
  const [contractGaps, setContractGaps] = useState<ContractGap[]>([]);
  const [evidenceList, setEvidenceList] = useState<EvidencePackage[]>([]);
  const [approvalsList, setApprovalsList] = useState<Approval[]>([]);
  const [executionRuns, setExecutionRuns] = useState<ExecutionRun[]>([]);
  const [codeQualityRuns, setCodeQualityRuns] = useState<CodeQualityRun[]>([]);
  const [slaData, setSlaData] = useState<WorkflowSLA | null>(null);
  const [almPreview, setAlmPreview] = useState<AlmPreview | null>(null);
  const [codeLogData, setCodeLogData] = useState<CodeLog | null>(null);
  const [showCodeLog, setShowCodeLog] = useState(true);
  const [showTestCases, setShowTestCases] = useState(true);
  const [showCoverageMatrix, setShowCoverageMatrix] = useState(true);
  const [almProvider, setAlmProvider] = useState<"azure_devops" | "jira">("azure_devops");
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active Tab
  const [activeTab, setActiveTab] = useState<"tests" | "executions" | "quality" | "evidence" | "sla" | "history">("tests");

  // Expanded items state
  const [expandedTestUuid, setExpandedTestUuid] = useState<string | null>(null);
  const [expandedExecId, setExpandedExecId] = useState<number | null>(null);
  const [selectedEvidence, setSelectedEvidence] = useState<EvidencePackage | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Decision state per approval
  const [comments, setComments] = useState<Record<string, string>>({});
  const [submittingUuid, setSubmittingUuid] = useState<string | null>(null);

  // Smart polling: stop continuous polling once workflow is finished, blocked, or paused at Human Checkpoints
  const isPausedOrDone = [
    "COMPLETED",
    "FAILED",
    "CANCELLED",
    "BLOCKED",
    "WAITING_FOR_REVIEW",
    "WAITING_FOR_APPROVAL",
  ].includes(workflowDetail?.status || "");

  const status = usePolling(
    () => workflowApi.status(id),
    2500,
    !isPausedOrDone && !loadingInitial
  );

  // References to track stage and status changes during polling
  const prevStageRef = useRef<string | null>(null);
  const prevStatusRef = useRef<string | null>(null);

  // Fetch core workflow data (essential for main view)
  const refreshCoreData = async () => {
    try {
      const [dRes, tRes, aRes, clRes, slaRes] = await Promise.all([
        workflowApi.detail(id).catch(() => ({ workflow: null })),
        testApi.forWorkflow(id).catch(() => ({ test_cases: [], coverage_matrix: [], generation_summary: undefined, contract_gaps: [] })),
        approvalApi.forWorkflow(id).catch(() => ({ approvals: [] })),
        testApi.codeLog(id).catch(() => ({ code_log: null })),
        workflowApi.sla(id).catch(() => ({ sla: null })),
      ]);
      if (dRes?.workflow) setWorkflowDetail(dRes.workflow);
      if (tRes) {
        setTests(tRes.test_cases ?? []);
        if (tRes.coverage_matrix) setCoverageMatrix(tRes.coverage_matrix);
        if (tRes.generation_summary) setGenerationSummary(tRes.generation_summary);
        if (tRes.contract_gaps) setContractGaps(tRes.contract_gaps);
      }
      setApprovalsList(aRes.approvals ?? []);
      if (clRes && clRes.code_log) setCodeLogData(clRes.code_log);
      if (slaRes && slaRes.sla) setSlaData(slaRes.sla);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoadingInitial(false);
    }
  };

  // Lazy-load data for secondary tabs only when opened
  const loadTabData = async (tab: typeof activeTab) => {
    try {
      if (tab === "executions") {
        const execRes = await testApi.executions(id).catch(() => ({ executions: [] }));
        setExecutionRuns(execRes.executions ?? []);
      } else if (tab === "quality") {
        const cqRes = await testApi.codeQuality(id).catch(() => ({ code_quality: [] }));
        setCodeQualityRuns(cqRes.code_quality ?? []);
      } else if (tab === "evidence") {
        const eRes = await evidenceApi.forWorkflow(id).catch(() => ({ evidence: [] }));
        setEvidenceList((eRes.evidence as EvidencePackage[]) ?? []);
      } else if (tab === "sla") {
        const slaRes = await workflowApi.sla(id).catch(() => ({ sla: null }));
        if (slaRes && slaRes.sla) setSlaData(slaRes.sla);
      } else if (tab === "history") {
        const almRes = await workflowApi.almPreview(id, almProvider).catch(() => ({ preview: null }));
        if (almRes && almRes.preview) setAlmPreview(almRes.preview);
      }
    } catch {
      // Ignore transient secondary tab errors
    }
  };

  // Full refresh called manually or after governance decisions
  const refreshData = async () => {
    await Promise.all([
      refreshCoreData(),
      loadTabData(activeTab),
    ]);
  };

  // Initial load
  useEffect(() => {
    refreshCoreData();
  }, [id]);

  // Load secondary tab data on tab switch
  useEffect(() => {
    if (activeTab !== "tests") {
      loadTabData(activeTab);
    }
  }, [activeTab, id]);

  // Re-fetch data ONLY when polling status or stage ACTUALLY advances
  useEffect(() => {
    if (status) {
      const stageChanged = status.current_stage && status.current_stage !== prevStageRef.current;
      const statusChanged = status.status && status.status !== prevStatusRef.current;

      if (stageChanged || statusChanged) {
        prevStageRef.current = status.current_stage;
        prevStatusRef.current = status.status;
        refreshCoreData();
        if (activeTab !== "tests") {
          loadTabData(activeTab);
        }
      }
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
        setWorkflowDetail((prev) => (prev ? { ...prev, status: "RUNNING" } : prev));
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

  const currentStage = status?.current_stage || workflowDetail?.current_stage || "CREATED";
  const currentStatus = status?.status || workflowDetail?.status || "RUNNING";

  const isWaiting =
    (currentStatus === "WAITING_FOR_REVIEW" || currentStatus === "WAITING_FOR_APPROVAL") &&
    ["TEST_REVIEW", "EVIDENCE_REVIEW", "ALM_APPROVAL"].includes(currentStage);

  const pendingApprovals = approvalsList.filter((a) => a.decision === "PENDING");
  const pastApprovals = approvalsList.filter((a) => a.decision !== "PENDING");

  // Display only real pending approvals
  const displayApprovals: Approval[] = pendingApprovals;

  const latestExec = executionRuns[0];
  const latestQuality = codeQualityRuns[0];

  return (
    <div className="mx-auto max-w-7xl w-full min-w-0 space-y-6">
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
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1">
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
            <h1 className="font-display text-xl font-bold text-[var(--color-text-primary)] truncate">
              {workflowDetail?.story_title || `TDD Workflow Run`}
            </h1>
          </div>
          <p className="font-mono text-xs text-[var(--color-text-secondary)] truncate">
            Run ID: <span className="text-[var(--color-text-primary)]">{id}</span>
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {slaData && (
            <div className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider border shadow-sm ${
              slaData.overall_sla_status === "MET"
                ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                : slaData.overall_sla_status === "BREACHED"
                ? "bg-red-500/15 text-red-300 border-red-500/30"
                : "bg-blue-500/15 text-blue-300 border-blue-500/30"
            }`}>
              <Gauge size={13} />
              <span>SLA: {slaData.overall_sla_status}</span>
            </div>
          )}
          <StatusBadge status={currentStatus} />
        </div>
      </div>

      {/* Main Grid: Stepper on Left, Workflow Content on Right */}
      <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)] min-w-0 w-full">
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
          <WorkflowStepper
            current={currentStage}
            status={currentStatus}
            onApprove={
              displayApprovals.length > 0
                ? () => handleDecide(displayApprovals[0], "APPROVED")
                : undefined
            }
            onReject={
              displayApprovals.length > 0
                ? () => handleDecide(displayApprovals[0], "REJECTED")
                : undefined
            }
            isSubmitting={submittingUuid !== null}
          />
        </Card>

        {/* Content Column */}
        <div className="space-y-6">
          {/* Active Human Governance Checkpoints Banner */}
          {displayApprovals.length > 0 && (
            <div className="rounded-2xl border-2 border-amber-500/40 bg-amber-500/5 p-5 shadow-lg space-y-4">
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

              {displayApprovals.map((a) => {
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

                    {/* ALM Write-Back Payload Inspector inside Checkpoint 3 */}
                    {(a.stage === "ALM_APPROVAL" || a.stage === "ALM_ATTACHMENT") && almPreview && (
                      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)]/60 p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Cpu size={15} className="text-[var(--color-primary)]" />
                            <span className="text-xs font-bold text-[var(--color-text-primary)]">
                              Target ALM Write-Back Payload Inspector
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setAlmProvider("azure_devops");
                                workflowApi.almPreview(id, "azure_devops").then((res) => setAlmPreview(res.preview));
                              }}
                              className={`px-2.5 py-0.5 text-[10px] font-bold rounded-lg transition-colors ${
                                almProvider === "azure_devops"
                                  ? "bg-[var(--color-primary)] text-white shadow-sm"
                                  : "bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:text-white"
                              }`}
                            >
                              Azure DevOps
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setAlmProvider("jira");
                                workflowApi.almPreview(id, "jira").then((res) => setAlmPreview(res.preview));
                              }}
                              className={`px-2.5 py-0.5 text-[10px] font-bold rounded-lg transition-colors ${
                                almProvider === "jira"
                                  ? "bg-[var(--color-primary)] text-white shadow-sm"
                                  : "bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:text-white"
                              }`}
                            >
                              Jira / Xray
                            </button>
                          </div>
                        </div>

                        <div className="space-y-1 font-mono text-[11px]">
                          <div className="flex items-center gap-1 text-[var(--color-text-secondary)]">
                            <span className="font-semibold text-[var(--color-text-primary)]">Target:</span> {almPreview.target_system}
                          </div>
                          <div className="text-cyan-400 break-all">
                            <span className="font-semibold text-[var(--color-text-primary)]">Endpoint:</span> {almPreview.endpoint}
                          </div>
                        </div>
                        <pre className="rounded-lg bg-[#0d1117] p-3 text-[11px] font-mono text-emerald-300 overflow-x-auto max-h-40 border border-white/5">
                          {JSON.stringify(almPreview.payload, null, 2)}
                        </pre>
                      </div>
                    )}

                    {/* Test Plan Review - Missing Functions */}
                    {a.stage === "TEST_PLAN_REVIEW" && workflowDetail?.state_json?.missing_functions && workflowDetail.state_json.missing_functions.length > 0 && (
                      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 space-y-3 shadow-inner">
                        <div className="flex items-center gap-2">
                          <AlertTriangle size={15} className="text-red-400" />
                          <span className="text-xs font-bold text-red-400">
                            Missing Functions / Endpoints Detected
                          </span>
                        </div>
                        <p className="text-[11px] text-red-300/80">
                          The following required functions were not found in the provided user story or Postman collection. Do you want to skip and proceed anyway?
                        </p>
                        <ul className="list-disc pl-5 text-[11px] text-red-300 font-mono space-y-1">
                          {workflowDetail.state_json.missing_functions.map((func: string, idx: number) => (
                            <li key={idx}>{func}</li>
                          ))}
                        </ul>
                      </div>
                    )}

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

            <button
              type="button"
              onClick={() => setActiveTab("sla")}
              className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
                activeTab === "sla"
                  ? "bg-[var(--color-primary)] text-white shadow-md shadow-[var(--color-primary)]/20"
                  : "bg-[var(--color-surface-elevated)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              <Gauge size={14} />
              <span>SLA & Evaluation</span>
              {slaData && (
                <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                  slaData.overall_sla_status === "MET"
                    ? "bg-emerald-500/20 text-emerald-300"
                    : slaData.overall_sla_status === "BREACHED"
                    ? "bg-red-500/20 text-red-300"
                    : "bg-blue-500/20 text-blue-300"
                }`}>
                  {slaData.overall_sla_status}
                </span>
              )}
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
              <div 
                className="mb-4 flex items-center justify-between cursor-pointer select-none hover:bg-white/[0.02] p-2 -m-2 rounded-lg transition-colors"
                onClick={() => setShowTestCases(!showTestCases)}
              >
                <div>
                  <h2 className="font-display text-base font-bold text-[var(--color-text-primary)] flex items-center gap-2">
                    <FlaskConical size={18} className="text-[var(--color-primary)]" />
                    <span>Generated Test Cases & Responsible Functions</span>
                  </h2>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                    Decomposed test scenarios mapped to responsible codebase functions and synthesised test classes.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-[var(--color-primary)]/10 px-2.5 py-1 font-mono text-xs font-bold text-[var(--color-primary)]">
                    {tests.length} Total Tests
                  </span>
                  <button type="button" className="text-zinc-400 hover:text-white">
                    {showTestCases ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </button>
                </div>
              </div>

              {showTestCases && (
                <>
                  {/* GENERATION QUALITY SUMMARY */}
              {generationSummary && (
                <div className="mb-4 grid gap-3 grid-cols-2 sm:grid-cols-4">
                  <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)] flex items-center gap-1">
                      <Layers size={12} className="text-blue-400" /> Test Synthesis
                    </span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-lg font-bold text-[var(--color-text-primary)]">
                        {generationSummary.final_unique_test_cases}
                      </span>
                      <span className="text-[10px] text-zinc-400">
                        ({generationSummary.total_candidates} cand / {generationSummary.duplicates_removed} deduped)
                      </span>
                    </div>
                  </div>

                  <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)] flex items-center gap-1">
                      <CheckCircle2 size={12} className="text-emerald-400" /> AC Coverage
                    </span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-lg font-bold text-emerald-400">
                        {generationSummary.acceptance_criteria_covered}/{generationSummary.acceptance_criteria_total}
                      </span>
                      <span className="rounded bg-emerald-500/20 px-1.5 py-0.2 text-[10px] font-bold text-emerald-300">
                        {generationSummary.coverage_pct}%
                      </span>
                    </div>
                  </div>

                  <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)] flex items-center gap-1">
                      <ShieldCheck size={12} className="text-purple-400" /> Grounding Status
                    </span>
                    <div className="flex items-center gap-1.5 text-[11px] font-mono">
                      <span className="text-emerald-400 font-semibold" title="Confirmed">{generationSummary.grounding_confirmed} C</span>
                      <span className="text-zinc-500">·</span>
                      <span className="text-cyan-400 font-semibold" title="Partially Confirmed">{generationSummary.grounding_partially_confirmed} P</span>
                      <span className="text-zinc-500">·</span>
                      <span className="text-amber-400 font-semibold" title="Needs Review">{generationSummary.needs_review} R</span>
                    </div>
                  </div>

                  <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)] flex items-center gap-1">
                      <AlertTriangle size={12} className={generationSummary.contract_gaps > 0 ? "text-amber-400" : "text-zinc-400"} /> Contract Gaps
                    </span>
                    <div className="flex items-baseline gap-1.5">
                      <span className={`text-lg font-bold ${generationSummary.contract_gaps > 0 ? "text-amber-400" : "text-zinc-400"}`}>
                        {generationSummary.contract_gaps}
                      </span>
                      <span className="text-[10px] text-zinc-400">
                        {generationSummary.contract_gaps > 0 ? "postman gap detected" : "all contracts matched"}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* ACCEPTANCE CRITERIA COVERAGE MATRIX TABLE */}
              {coverageMatrix && coverageMatrix.length > 0 && (
                <div className="mb-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden shadow-sm">
                  <div 
                    className="p-3 bg-[var(--color-surface-elevated)] border-b border-[var(--color-border)] flex items-center justify-between cursor-pointer select-none hover:bg-[#1f242c] transition-colors"
                    onClick={() => setShowCoverageMatrix(!showCoverageMatrix)}
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={15} className="text-emerald-400" />
                      <span className="text-xs font-bold text-[var(--color-text-primary)]">
                        Acceptance Criteria Coverage Matrix
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-mono font-bold text-emerald-300">
                        {coverageMatrix.filter(c => c.covered).length}/{coverageMatrix.length} Covered ({coverageMatrix.filter(c => c.covered).length === coverageMatrix.length ? '100%' : `${Math.round(coverageMatrix.filter(c => c.covered).length / coverageMatrix.length * 100)}%`})
                      </span>
                      <button type="button" className="text-zinc-400 hover:text-white">
                        {showCoverageMatrix ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                    </div>
                  </div>
                  
                  {showCoverageMatrix && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[#161b22] text-[10px] uppercase font-bold text-[var(--color-text-secondary)] border-b border-[var(--color-border)]">
                        <tr>
                          <th className="p-2.5 w-20">AC Key</th>
                          <th className="p-2.5">Requirement</th>
                          <th className="p-2.5 w-24">Covered</th>
                          <th className="p-2.5">Mapped Test Cases</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--color-border)] font-mono text-[11px]">
                        {coverageMatrix.map((item, idx) => (
                          <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                            <td className="p-2.5 font-bold text-[var(--color-primary)]">
                              {item.ac_key}
                            </td>
                            <td className="p-2.5 font-sans text-zinc-200">
                              {item.requirement}
                            </td>
                            <td className="p-2.5">
                              {item.covered ? (
                                <span className="inline-flex items-center gap-1 rounded bg-emerald-500/20 border border-emerald-500/30 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300">
                                  <CheckCircle2 size={10} /> YES
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded bg-red-500/20 border border-red-500/30 px-1.5 py-0.5 text-[10px] font-bold text-red-300">
                                  <XCircle size={10} /> NO
                                </span>
                              )}
                            </td>
                            <td className="p-2.5">
                              <div className="flex flex-wrap gap-1">
                                {item.test_case_keys.map((tk, kidx) => (
                                  <button
                                    key={kidx}
                                    type="button"
                                    onClick={() => {
                                      const targetTest = tests.find(t => t.test_key === tk);
                                      if (targetTest) setExpandedTestUuid(targetTest.uuid);
                                    }}
                                    className="rounded bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 px-1.5 py-0.5 text-[10px] font-bold text-[var(--color-primary)] hover:bg-[var(--color-primary)]/20 transition-colors"
                                  >
                                    {tk}
                                  </button>
                                ))}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  )}
                </div>
              )}

              {/* API CONTRACT COMPLETENESS / GAP NOTICE */}
              {(contractGaps.length > 0 || tests.some((t) => t.grounding_metadata?.endpoint?.source === "STORY" || t.requires_review)) && (
                <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 flex items-start gap-3 text-xs shadow-sm">
                  <div className="rounded-lg bg-amber-500/20 p-1.5 text-amber-400 shrink-0 mt-0.5">
                    <AlertTriangle size={16} />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-amber-300 uppercase tracking-wider text-[10px]">
                        API Contract Gap & Source Grounding Notice
                      </span>
                      <span className="rounded bg-amber-500/20 px-1.5 py-0.2 text-[9px] font-mono font-bold text-amber-300">
                        {contractGaps.length > 0 ? `${contractGaps.length} Contract Gap(s)` : "Story Grounded"}
                      </span>
                    </div>
                    <p className="text-zinc-200 text-[11px] leading-relaxed">
                      {contractGaps.length > 0
                        ? contractGaps[0].warning
                        : "Some test scenarios target endpoints defined in the User Story / Acceptance Criteria that were not present in the uploaded Postman collection. Response schemas are strictly derived from Acceptance Criteria without fabricating ungrounded JSON structures."}
                    </p>
                  </div>
                </div>
              )}

              {/* CODE GENERATION & WORKSPACE WRITE LOG PANEL */}
              {codeLogData && (
                <div className="mb-5 rounded-xl border border-[var(--color-border)] bg-[#0d1117] overflow-hidden shadow-lg">
                  <div
                    onClick={() => setShowCodeLog(!showCodeLog)}
                    className="flex items-center justify-between p-3.5 bg-[#161b22] border-b border-[var(--color-border)] cursor-pointer select-none hover:bg-[#1f242c] transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <Terminal size={16} className="text-emerald-400" />
                      <span className="text-xs font-bold text-white tracking-wide">
                        Code Generation & Workspace Write Log
                      </span>
                      <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-mono font-semibold text-emerald-300">
                        {codeLogData.total_lines_generated} lines synthesized · {codeLogData.elapsed_ms}ms
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      {codeLogData.files_written?.length > 0 && (
                        <span className="text-[11px] font-mono text-zinc-400 hidden sm:inline">
                          📁 {codeLogData.files_written[0].relative_path || codeLogData.files_written[0].class_name}
                        </span>
                      )}
                      <button type="button" className="text-zinc-400 hover:text-white">
                        {showCodeLog ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                    </div>
                  </div>

                  {showCodeLog && (
                    <div className="p-4 space-y-3 font-mono text-xs">
                      {codeLogData.files_written?.length > 0 && (
                        <div className="grid gap-2 sm:grid-cols-2 pb-3 border-b border-zinc-800">
                          {codeLogData.files_written.map((fw, fidx) => (
                            <div key={fidx} className="rounded-lg bg-black/40 border border-zinc-800 p-2.5 flex items-center justify-between">
                              <div className="flex items-center gap-2 truncate">
                                <FileCode size={14} className="text-[var(--color-primary)] shrink-0" />
                                <span className="text-[11px] text-zinc-200 truncate">{fw.relative_path || fw.file_path}</span>
                              </div>
                              <span className="text-[10px] text-emerald-400 shrink-0 font-semibold">{fw.lines_count} lines</span>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="space-y-1 max-h-56 overflow-y-auto pr-2 leading-relaxed text-[11px]">
                        {codeLogData.log_entries?.map((log, lIdx) => {
                          const isSuccess = log.includes("[SUCCESS]") || log.includes("[WORKSPACE_WRITE]") || log.includes("[COMPLETE]");
                          const isInit = log.includes("[INIT]") || log.includes("[CONFIG]");
                          const isTarget = log.includes("[TARGET]") || log.includes("[SYNTHESIS]");
                          return (
                            <div key={lIdx} className="flex items-start gap-2">
                              <span className="text-zinc-600 select-none text-[10px]">{lIdx + 1}.</span>
                              <span className={isSuccess ? "text-emerald-400" : isInit ? "text-cyan-400 font-semibold" : isTarget ? "text-amber-300" : "text-zinc-300"}>
                                {log}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

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

                    const respFuncs = Array.isArray(t.responsible_functions)
                      ? t.responsible_functions
                      : t.responsible_functions
                      ? [t.responsible_functions]
                      : [];

                    const reqMethod = t.request_spec?.method || "GET";
                    const reqEndpoint = t.request_spec?.endpoint || "";
                    const reqHeaders = t.request_spec?.headers || {};
                    const reqBody = t.request_spec?.body;

                    const expectedStatusCode = t.expected_response_spec?.status_code || t.expected_status_code || "N/A";
                    const statusSource = t.expected_response_spec?.status_source || "AI_ASSUMPTION";
                    const isConfirmedStatus = statusSource === "ACCEPTANCE_CRITERIA" || statusSource === "CONTRACT_SPECIFIED";
                    const requiresReview = t.requires_review || !isConfirmedStatus;

                    const expResponseBody = t.expected_response_spec?.response_body;
                    const expAssertions = t.expected_response_spec?.assertions || [];

                    const preconditions = Array.isArray(t.preconditions)
                      ? t.preconditions
                      : t.preconditions
                      ? [t.preconditions]
                      : [];

                    const testSteps = Array.isArray(t.test_steps)
                      ? t.test_steps
                      : t.test_steps
                      ? [t.test_steps]
                      : [];

                    const groundingMeta = t.grounding_metadata;
                    const overallGrounding = groundingMeta?.overall_grounding || (isConfirmedStatus ? "CONFIRMED" : "AI-DERIVED");

                    return (
                      <div
                        key={t.uuid}
                        className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden transition-all hover:border-[var(--color-primary)]/40 shadow-sm"
                      >
                        {/* Test Header / Summary Row */}
                        <div
                          onClick={() => setExpandedTestUuid(isExpanded ? null : t.uuid)}
                          className="p-4 cursor-pointer hover:bg-[var(--color-surface-elevated)]/40 transition-colors space-y-3"
                        >
                          {/* Top Row: Key + Title on Left, Status Badges + Chevron on Right */}
                          <div className="flex flex-wrap sm:flex-nowrap items-start justify-between gap-3">
                            <div className="flex items-start gap-2.5 min-w-0 flex-1">
                              <span className="rounded-lg bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 px-2.5 py-1 font-mono text-xs font-bold text-[var(--color-primary)] shrink-0 mt-0.5">
                                {t.test_key}
                              </span>
                              <div className="min-w-0 flex-1">
                                <h3 className="text-xs font-bold text-[var(--color-text-primary)] leading-snug">
                                  {t.title}
                                </h3>
                                {t.description && t.description !== t.title && (
                                  <p className="text-[11px] text-[var(--color-text-secondary)] mt-0.5 line-clamp-2">
                                    {t.description}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-1.5 shrink-0 self-start">
                              {t.test_type && (
                                <span className="rounded-md bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 text-[10px] font-mono font-bold uppercase text-purple-300">
                                  {t.test_type}
                                </span>
                              )}
                              {t.scenario_type && (
                                <span className={`rounded-md border px-2 py-0.5 text-[10px] font-mono uppercase font-semibold shrink-0 ${scenarioTypeBadgeColor}`}>
                                  {t.scenario_type}
                                </span>
                              )}
                              <span className={`rounded-md border px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider ${
                                overallGrounding === "CONFIRMED"
                                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                                  : overallGrounding === "PARTIALLY_CONFIRMED"
                                  ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-300"
                                  : overallGrounding === "NEEDS_REVIEW"
                                  ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
                                  : "bg-purple-500/10 border-purple-500/30 text-purple-300"
                              }`}>
                                {overallGrounding.replace(/_/g, " ")}
                              </span>
                              <OriginBadge origin={t.origin} />
                              <StatusBadge status={t.status} />
                              <button
                                type="button"
                                className="p-1 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] shrink-0 ml-1"
                              >
                                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                              </button>
                            </div>
                          </div>

                          {/* Story & AC Traceability Banner */}
                          {t.story_reference && (
                            <div className="rounded-lg bg-sky-50 dark:bg-cyan-950/30 border border-sky-200/90 dark:border-cyan-500/30 px-3.5 py-2.5 text-xs flex items-start gap-2.5 w-full shadow-sm">
                              <div className="rounded-md bg-sky-100 dark:bg-cyan-900/40 p-1 text-sky-600 dark:text-cyan-400 shrink-0 mt-0.5">
                                <FileText size={14} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2 mb-0.5">
                                  <span className="font-bold text-sky-800 dark:text-cyan-300 text-[10px] uppercase tracking-wider">
                                    Source Grounding & Acceptance Criteria:
                                  </span>
                                  {t.acceptance_criteria_ids && t.acceptance_criteria_ids.length > 0 && (
                                    t.acceptance_criteria_ids.map((acId, acIdx) => (
                                      <span key={acIdx} className="rounded bg-sky-600/15 text-sky-800 dark:bg-cyan-400/15 dark:text-cyan-300 px-1.5 py-0.2 font-mono text-[9px] font-bold">
                                        {acId}
                                      </span>
                                    ))
                                  )}
                                </div>
                                <p className="text-[12px] text-zinc-800 dark:text-zinc-200 font-medium leading-relaxed break-words">
                                  {t.story_reference}
                                </p>
                              </div>
                            </div>
                          )}

                          {/* Code Under Test Call Chain */}
                          <div className="flex flex-wrap items-center gap-1.5 w-full pt-0.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)] flex items-center gap-1 shrink-0 mr-1">
                              <Target size={11} className="text-[var(--color-primary)]" /> Responsible Functions:
                            </span>
                            {respFuncs.length > 0 ? (
                              respFuncs.map((fn, fIdx) => (
                                <div key={fIdx} className="flex items-center gap-1.5">
                                  <span className="inline-flex items-center rounded-md bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 px-2 py-0.5 font-mono text-[10px] font-medium text-[var(--color-primary)] break-all">
                                    {fn}
                                  </span>
                                  {fIdx < respFuncs.length - 1 && (
                                    <ArrowRight size={11} className="text-zinc-500 shrink-0" />
                                  )}
                                </div>
                              ))
                            ) : (
                              <span className="text-[10px] font-mono text-zinc-400 italic">
                                None identified (requires codebase context)
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Expandable Test Details */}
                        {isExpanded && (
                          <div className="border-t border-[var(--color-border)] bg-[var(--color-surface-elevated)]/20 p-4 space-y-4">
                            {/* PRECONDITIONS & TEST STEPS */}
                            {(preconditions.length > 0 || testSteps.length > 0) && (
                              <div className="grid gap-4 sm:grid-cols-2 text-xs">
                                {preconditions.length > 0 && (
                                  <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5 space-y-2">
                                    <span className="font-bold text-xs text-[var(--color-text-primary)] flex items-center gap-1.5 text-blue-400">
                                      <Layers size={14} /> Preconditions
                                    </span>
                                    <ul className="space-y-1 text-zinc-300 text-[11px] list-disc list-inside">
                                      {preconditions.map((p, pIdx) => (
                                        <li key={pIdx} className="leading-relaxed">{p}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}

                                {testSteps.length > 0 && (
                                  <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5 space-y-2">
                                    <span className="font-bold text-xs text-[var(--color-text-primary)] flex items-center gap-1.5 text-emerald-400">
                                      <FileCheck2 size={14} /> Structured Test Procedure
                                    </span>
                                    <div className="space-y-1.5 text-zinc-300 text-[11px]">
                                      {testSteps.map((step, sIdx) => (
                                        <div key={sIdx} className="flex items-start gap-2">
                                          <span className="rounded bg-emerald-500/20 text-emerald-300 font-mono text-[9px] px-1 py-0.5 shrink-0 mt-0.5">
                                            {sIdx + 1}
                                          </span>
                                          <span className="leading-relaxed">{step}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* REQUEST & EXPECTED RESPONSE SPECIFICATIONS GRID */}
                            <div className="grid gap-4 lg:grid-cols-2 text-xs">
                              {/* 1. Request Specification */}
                              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5 space-y-2.5">
                                <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-2">
                                  <span className="font-bold text-xs text-[var(--color-text-primary)] flex items-center gap-1.5">
                                    <Zap size={14} className="text-amber-400" />
                                    HTTP Request Specification
                                  </span>
                                  <span
                                    className={`rounded px-2 py-0.5 font-mono text-[10px] font-bold uppercase ${
                                      reqMethod === "POST"
                                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                        : reqMethod === "GET"
                                        ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                                        : reqMethod === "PUT"
                                        ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                                        : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                                    }`}
                                  >
                                    {reqMethod}
                                  </span>
                                </div>

                                <div className="space-y-1.5 font-mono text-[11px]">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[var(--color-text-secondary)]">Endpoint:</span>
                                    <span className="text-cyan-300 font-bold break-all">
                                      {reqEndpoint || "N/A (Unit/Integration Test)"}
                                    </span>
                                  </div>
                                  {Object.keys(reqHeaders).length > 0 && (
                                    <div className="flex items-start gap-2">
                                      <span className="text-[var(--color-text-secondary)] shrink-0">Headers:</span>
                                      <span className="text-zinc-400 break-all font-mono text-[10px]">
                                        {JSON.stringify(reqHeaders)}
                                      </span>
                                    </div>
                                  )}
                                </div>

                                {reqBody ? (
                                  <div className="space-y-1 pt-1">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
                                      Request Payload (Test Data):
                                    </span>
                                    <pre className="rounded-lg bg-[#0d1117] p-2.5 text-[11px] font-mono text-cyan-300 overflow-x-auto max-h-40 border border-white/5">
                                      <code>{JSON.stringify(reqBody, null, 2)}</code>
                                    </pre>
                                  </div>
                                ) : (
                                  <div className="rounded-lg bg-[var(--color-surface-elevated)] p-2 text-[10px] font-mono text-[var(--color-text-secondary)]">
                                    No request body required
                                  </div>
                                )}
                              </div>

                              {/* 2. Expected Response Specification */}
                              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5 space-y-2.5">
                                <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-2">
                                  <span className="font-bold text-xs text-[var(--color-text-primary)] flex items-center gap-1.5">
                                    <ShieldCheck size={14} className="text-emerald-400" />
                                    Expected Response & Assertions
                                  </span>
                                  <span className={`rounded px-2 py-0.5 font-mono text-[10px] font-bold ${
                                    isConfirmedStatus
                                      ? "bg-emerald-500/20 border border-emerald-500/30 text-emerald-400"
                                      : "bg-amber-500/20 border border-amber-500/30 text-amber-400"
                                  }`}>
                                    HTTP {expectedStatusCode}
                                  </span>
                                </div>

                                {/* Status Source Verification Alert */}
                                {requiresReview ? (
                                  <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-2.5 space-y-1 text-[11px]">
                                    <div className="flex items-center gap-1.5 font-bold text-amber-300">
                                      <AlertTriangle size={13} className="text-amber-400 shrink-0" />
                                      <span>AI Assumption · Review Required</span>
                                    </div>
                                    <div className="text-amber-200/90 pl-5 text-[10px]">
                                      {t.assumption_details || `Status code HTTP ${expectedStatusCode} was inferred from requirements and requires verification.`}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-2 flex items-center gap-1.5 text-emerald-300 text-[11px]">
                                    <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                                    <span>Status HTTP {expectedStatusCode} (Confirmed in Acceptance Criteria)</span>
                                  </div>
                                )}

                                {expResponseBody ? (
                                  <div className="space-y-1">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
                                      Expected Response Payload:
                                    </span>
                                    <pre className="rounded-lg bg-[#0d1117] p-2.5 text-[11px] font-mono text-emerald-300 overflow-x-auto max-h-36 border border-white/5">
                                      <code>{JSON.stringify(expResponseBody, null, 2)}</code>
                                    </pre>
                                  </div>
                                ) : (
                                  <div className="rounded-lg bg-[var(--color-surface-elevated)] p-2.5 text-[11px] font-mono text-zinc-400 space-y-0.5">
                                    <div className="text-[10px] uppercase font-bold text-zinc-300">Response Payload Spec:</div>
                                    <div className="text-zinc-400 text-[10px]">
                                      Not specified in Acceptance Criteria (No fabricated response JSON generated).
                                    </div>
                                  </div>
                                )}

                                {expAssertions && expAssertions.length > 0 && (
                                  <div className="space-y-1 pt-1">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
                                      Assertions:
                                    </span>
                                    <div className="space-y-1 font-mono text-[10px]">
                                      {expAssertions.map((ast, aIdx) => (
                                        <div key={aIdx} className="flex items-center gap-1.5 text-zinc-300">
                                          <Check size={11} className="text-emerald-400 shrink-0" />
                                          <span>{ast}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* GROUNDING & TRACEABILITY AUDIT BLOCK */}
                            {groundingMeta && (
                              <div className="rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] p-3.5 space-y-2 text-xs">
                                <span className="font-semibold text-xs text-[var(--color-text-primary)] flex items-center gap-1.5 text-cyan-400">
                                  <ShieldCheck size={14} /> Source Grounding Audit:
                                </span>
                                <div className="grid gap-2 sm:grid-cols-3 font-mono text-[11px]">
                                  <div className="rounded-lg bg-[var(--color-surface-elevated)] p-2 border border-zinc-800">
                                    <div className="text-[10px] uppercase text-zinc-400">Endpoint Source</div>
                                    <div className="text-cyan-300 font-bold mt-0.5">{groundingMeta.endpoint?.source || "STORY"}</div>
                                    <div className="text-[9px] text-zinc-500">{groundingMeta.endpoint?.reference || "AC-01"}</div>
                                  </div>
                                  <div className="rounded-lg bg-[var(--color-surface-elevated)] p-2 border border-zinc-800">
                                    <div className="text-[10px] uppercase text-zinc-400">Status Code Source</div>
                                    <div className="text-emerald-300 font-bold mt-0.5">{groundingMeta.status_code?.source || statusSource}</div>
                                    <div className="text-[9px] text-zinc-500">{groundingMeta.status_code?.reference || "AC Spec"}</div>
                                  </div>
                                  <div className="rounded-lg bg-[var(--color-surface-elevated)] p-2 border border-zinc-800">
                                    <div className="text-[10px] uppercase text-zinc-400">Response Body Source</div>
                                    <div className="text-amber-300 font-bold mt-0.5">{groundingMeta.response_body?.source || "UNKNOWN"}</div>
                                    <div className="text-[9px] text-zinc-500 truncate">{groundingMeta.response_body?.note || "Not defined"}</div>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Metadata Summary */}
                            <div className="grid gap-3 sm:grid-cols-2 text-xs">
                              {t.expected_result && (
                                <div className="rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] p-3">
                                  <span className="font-semibold text-[var(--color-text-primary)] block mb-1">
                                    Expected Result Summary:
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

                            {/* Generated Code Display — ONLY rendered post-approval when code is generated */}
                            {workflowDetail?.current_stage !== "TEST_REVIEW" && t.status !== "AWAITING_REVIEW" && t.generated_code ? (
                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                  <span className="flex items-center gap-1.5 text-xs font-semibold text-[var(--color-text-primary)]">
                                    <Code2 size={14} className="text-[var(--color-primary)]" />
                                    Synthesized Test Code ({t.target_language || "Java"}):
                                  </span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigator.clipboard.writeText(t.generated_code || "");
                                      setCopiedKey(t.test_key);
                                      setTimeout(() => setCopiedKey(null), 2000);
                                    }}
                                    className="flex items-center gap-1 text-[11px] text-[var(--color-primary)] hover:underline"
                                  >
                                    {copiedKey === t.test_key ? (
                                      <>
                                        <Check size={12} /> Copied
                                      </>
                                    ) : (
                                      <>
                                        <Copy size={12} /> Copy Code
                                      </>
                                    )}
                                  </button>
                                </div>
                                <pre className="rounded-xl bg-[#0d1117] p-3 text-xs font-mono text-emerald-300 overflow-x-auto max-h-72 border border-white/5">
                                  <code>{t.generated_code}</code>
                                </pre>
                              </div>
                            ) : null}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              </>
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
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-base font-bold text-[var(--color-text-primary)]">
                    Execution Evidence & Audit Proof
                  </h2>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                    Immutable, SHA256-signed test evidence documents exportable in HTML, Markdown, and JSON.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={workflowApi.getEvidenceDownloadUrl(id, "html")}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--color-primary)]/40 bg-[var(--color-primary)]/10 px-3 py-1.5 text-xs font-semibold text-[var(--color-primary)] hover:bg-[var(--color-primary)]/20 transition-colors"
                  >
                    <Download size={13} />
                    <span>Download HTML Report</span>
                  </a>

                  <a
                    href={workflowApi.getEvidenceDownloadUrl(id, "json")}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text-secondary)] hover:text-white transition-colors"
                  >
                    <FileCode size={13} />
                    <span>JSON Bundle</span>
                  </a>

                  <span className="rounded-full bg-[var(--color-surface-elevated)] px-2.5 py-1 font-mono text-xs text-[var(--color-text-secondary)]">
                    {evidenceList.length} Artifact(s)
                  </span>
                </div>
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

                        <div className="flex flex-wrap items-center gap-2">
                          <a
                            href={workflowApi.getEvidenceDownloadUrl(id, "html")}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-2.5 py-1.5 font-medium text-[var(--color-text-secondary)] hover:text-white transition-colors"
                          >
                            <Printer size={13} /> Print / HTML
                          </a>

                          <Button
                            variant="secondary"
                            onClick={() => setSelectedEvidence(e)}
                            className="flex items-center gap-1.5 text-xs py-1.5 px-3 font-semibold"
                          >
                            <FileText size={14} /> View Markdown
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          {/* TAB: SLA & EVALUATION METRICS */}
          {activeTab === "sla" && (
            <Card>
              <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="font-display text-base font-bold text-[var(--color-text-primary)] flex items-center gap-2">
                    <Gauge className="text-[var(--color-primary)]" size={18} />
                    Workflow SLA & Quality Gate Evaluation
                  </h2>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                    Real-time measurement against architectural SLAs, requirement coverage targets, quality gates, and cost metrics.
                  </p>
                </div>

                {slaData && (
                  <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider border ${
                    slaData.overall_sla_status === "MET"
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                      : slaData.overall_sla_status === "BREACHED"
                      ? "bg-red-500/20 text-red-300 border-red-500/40"
                      : "bg-blue-500/20 text-blue-300 border-blue-500/40"
                  }`}>
                    Overall SLA: {slaData.overall_sla_status}
                  </span>
                )}
              </div>

              {!slaData ? (
                <div className="rounded-xl border border-dashed border-[var(--color-border)] p-8 text-center">
                  <Gauge size={32} className="mx-auto text-[var(--color-text-secondary)]/40 mb-2" />
                  <p className="text-xs font-medium text-[var(--color-text-secondary)]">
                    SLA data is calculating for this workflow run...
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Key SLA Metric Cards */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)]/50 p-4 space-y-1">
                      <div className="flex items-center justify-between text-xs text-[var(--color-text-secondary)]">
                        <span className="font-semibold">Pipeline Latency</span>
                        <Timer size={14} className="text-[var(--color-primary)]" />
                      </div>
                      <div className="text-lg font-bold font-mono text-[var(--color-text-primary)]">
                        {(slaData.total_actual_latency_ms / 1000).toFixed(2)}s
                      </div>
                      <div className="text-[10px] text-[var(--color-text-secondary)]">
                        Target: &le; {(slaData.total_target_latency_ms / 1000).toFixed(1)}s max
                      </div>
                    </div>

                    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)]/50 p-4 space-y-1">
                      <div className="flex items-center justify-between text-xs text-[var(--color-text-secondary)]">
                        <span className="font-semibold">Requirement Coverage</span>
                        <Layers size={14} className="text-cyan-400" />
                      </div>
                      <div className="text-lg font-bold font-mono text-cyan-300">
                        {slaData.requirement_coverage.coverage_percentage}%
                      </div>
                      <div className="text-[10px] text-[var(--color-text-secondary)]">
                        Target: &ge; {slaData.requirement_coverage.target_percentage}% ({slaData.requirement_coverage.generated_test_cases} tests / {slaData.requirement_coverage.total_acceptance_criteria} ACs)
                      </div>
                    </div>

                    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)]/50 p-4 space-y-1">
                      <div className="flex items-center justify-between text-xs text-[var(--color-text-secondary)]">
                        <span className="font-semibold">Code Quality Gate</span>
                        <ShieldCheck size={14} className={slaData.quality_gate.status === "PASS" ? "text-emerald-400" : "text-red-400"} />
                      </div>
                      <div className={`text-lg font-bold font-mono ${slaData.quality_gate.status === "PASS" ? "text-emerald-300" : "text-red-300"}`}>
                        {slaData.quality_gate.score}% ({slaData.quality_gate.status})
                      </div>
                      <div className="text-[10px] text-[var(--color-text-secondary)]">
                        Quality Threshold: &ge; {slaData.quality_gate.threshold}%
                      </div>
                    </div>

                    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)]/50 p-4 space-y-1">
                      <div className="flex items-center justify-between text-xs text-[var(--color-text-secondary)]">
                        <span className="font-semibold">Token & Cost Est.</span>
                        <Coins size={14} className="text-amber-400" />
                      </div>
                      <div className="text-lg font-bold font-mono text-amber-300">
                        ${slaData.token_observability.estimated_cost_usd.toFixed(4)}
                      </div>
                      <div className="text-[10px] text-[var(--color-text-secondary)]">
                        Est. Tokens: {slaData.token_observability.estimated_total_tokens.toLocaleString()} (Gemini Flash)
                      </div>
                    </div>
                  </div>

                  {/* Stage Latency SLA Breakdown Table */}
                  <div className="space-y-3">
                    <h3 className="font-display text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
                      Stage Latency SLA Performance
                    </h3>
                    <div className="overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
                      <table className="w-full text-left text-xs">
                        <thead className="border-b border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-[var(--color-text-secondary)] font-mono text-[11px]">
                          <tr>
                            <th className="p-3">Stage / Responsibility</th>
                            <th className="p-3">Execution Tier</th>
                            <th className="p-3">Target SLA</th>
                            <th className="p-3">Actual Latency</th>
                            <th className="p-3">Variance (&Delta;)</th>
                            <th className="p-3 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--color-border)]">
                          {slaData.stage_metrics.map((m) => (
                            <tr key={m.stage} className="hover:bg-[var(--color-surface-elevated)]/30 transition-colors">
                              <td className="p-3 font-semibold text-[var(--color-text-primary)]">
                                {m.label}
                              </td>
                              <td className="p-3 text-[var(--color-text-secondary)]">
                                <span className="rounded bg-[var(--color-surface-elevated)] px-2 py-0.5 font-mono text-[10px]">
                                  {m.tier}
                                </span>
                              </td>
                              <td className="p-3 font-mono text-[var(--color-text-secondary)]">
                                &le; {m.target_ms}ms
                              </td>
                              <td className="p-3 font-mono font-bold text-[var(--color-text-primary)]">
                                {m.executed ? `${m.actual_ms}ms` : "-"}
                              </td>
                              <td className="p-3 font-mono text-[11px]">
                                {m.executed ? (
                                  <span className={m.delta_ms <= 0 ? "text-emerald-400" : "text-red-400"}>
                                    {m.delta_ms <= 0 ? `${m.delta_ms}ms` : `+${m.delta_ms}ms`}
                                  </span>
                                ) : "-"}
                              </td>
                              <td className="p-3 text-center">
                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                                  m.status === "MET" ? "bg-emerald-500/20 text-emerald-300" :
                                  m.status === "BREACHED" ? "bg-red-500/20 text-red-300" :
                                  "bg-gray-500/20 text-gray-400"
                                }`}>
                                  {m.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
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

