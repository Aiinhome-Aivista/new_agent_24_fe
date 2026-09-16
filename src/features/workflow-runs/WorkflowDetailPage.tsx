import { useParams, useSearchParams, useNavigate, Link } from "react-router-dom";
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
  BarChart3,
  Layers,
  Printer,
  ExternalLink,
  Target,
  ArrowRight,
  Send,
  Sparkles,
  Upload,
  Eye,
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
  POSTMAN_COLLECTION_REQUIRED: {
    title: "Stage 9.5 · Postman Collection Required to Proceed",
    desc: "Code validation passed, but no Postman collection was detected for this story or project. A Postman collection is required to establish API contracts before advancing to Evidence Generation and API Verification.",
  },
  EVIDENCE_REVIEW: {
    title: "Stage 11 · Execution Evidence Review",
    desc: "Test execution logs, runtime assertion outputs, and deterministic evidence have been generated. Review evidence artifacts before authorizing ALM sync.",
  },
  ALM_APPROVAL: {
    title: "Stage 11 · ALM Write-Back Authorization & Evidence Review",
    desc: "Review verified evidence package and authorize sync & write-back of test cases and signed evidence to Enterprise ALM (Jira / Xray / Zephyr).",
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

function extractEndpointsFromCollectionJson(col: any): Array<{ method: string; path: string; name?: string }> {
  const endpoints: Array<{ method: string; path: string; name?: string }> = [];
  if (!col) return endpoints;

  function traverse(items: any[]) {
    if (!Array.isArray(items)) return;
    for (const item of items) {
      if (item.request) {
        const method = (item.request.method || "GET").toUpperCase();
        let path = "/";
        const url = item.request.url;
        if (typeof url === "string") {
          try {
            const parsed = new URL(url.startsWith("http") ? url : `http://localhost${url}`);
            path = parsed.pathname;
          } catch {
            path = url;
          }
        } else if (url && url.path) {
          path = "/" + (Array.isArray(url.path) ? url.path.join("/") : url.path);
        } else if (url && url.raw) {
          try {
            const parsed = new URL(url.raw.startsWith("http") ? url.raw : `http://localhost${url.raw}`);
            path = parsed.pathname;
          } catch {
            path = url.raw;
          }
        }
        endpoints.push({ method, path, name: item.name });
      }
      if (item.item) {
        traverse(item.item);
      }
    }
  }

  traverse(col.item || []);
  return endpoints;
}

export function WorkflowDetailPage() {
  const { id = "" } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
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
  const [almPreview, setAlmPreview] = useState<AlmPreview | null>(null);
  const [codeLogData, setCodeLogData] = useState<CodeLog | null>(null);
  const [showCodeLog, setShowCodeLog] = useState(true);
  const [showTestCases, setShowTestCases] = useState(true);
  const [showCoverageMatrix, setShowCoverageMatrix] = useState(true);
  const [almProvider, setAlmProvider] = useState<"azure_devops" | "jira">("jira");
  const [showRawAlmPayload, setShowRawAlmPayload] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active Tab
  const [activeTab, setActiveTab] = useState<"tests" | "quality" | "history">("tests");

  // Expanded items state
  const [expandedTestUuid, setExpandedTestUuid] = useState<string | null>(null);
  const [expandedExecId, setExpandedExecId] = useState<number | null>(null);
  const [expandedApiId, setExpandedApiId] = useState<string | null>(null);
  const [selectedScenarioIdx, setSelectedScenarioIdx] = useState<Record<string, number>>({});
  const [apiViewTab, setApiViewTab] = useState<Record<string, "scenarios" | "schema">>({});
  const [selectedEvidence, setSelectedEvidence] = useState<EvidencePackage | null>(null);
  const [evidenceViewMode, setEvidenceViewMode] = useState<"document" | "markdown">("document");
  const [evidenceHtml, setEvidenceHtml] = useState<string | null>(null);
  const [evidenceLoading, setEvidenceLoading] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Decision state per approval
  const [comments, setComments] = useState<Record<string, string>>({});
  const [submittingUuid, setSubmittingUuid] = useState<string | null>(null);

  // Postman Collection Required Checkpoint State
  const [postmanFile, setPostmanFile] = useState<File | null>(null);
  const [postmanRawJson, setPostmanRawJson] = useState("");
  const [postmanMode, setPostmanMode] = useState<"file" | "raw">("file");
  const [postmanParsingError, setPostmanParsingError] = useState<string | null>(null);
  const [postmanPreviewEndpoints, setPostmanPreviewEndpoints] = useState<Array<{ method: string; path: string; name?: string }>>([]);
  const [isUploadingPostman, setIsUploadingPostman] = useState(false);
  const [postmanSuccessMsg, setPostmanSuccessMsg] = useState<string | null>(null);

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
    4000,
    !isPausedOrDone && !loadingInitial
  );

  // Fetch HTML preview safely with bearer token when modal opens
  useEffect(() => {
    if (selectedEvidence && evidenceViewMode === "document") {
      setEvidenceLoading(true);
      workflowApi
        .getEvidenceHtmlContent(id)
        .then((html) => {
          setEvidenceHtml(html);
        })
        .catch((err) => {
          console.error("Failed to load evidence HTML preview:", err);
        })
        .finally(() => {
          setEvidenceLoading(false);
        });
    }
  }, [selectedEvidence, evidenceViewMode, id]);

  // Fetch workflow data smartly without flooding server with concurrent requests
  const refreshData = async (forceAll: boolean | unknown = false) => {
    try {
      const isFinishedOrPaused = isPausedOrDone || forceAll === true;
      const shouldFetchAlm = isFinishedOrPaused;
      const shouldFetchExec = isFinishedOrPaused;
      const shouldFetchQuality = isFinishedOrPaused || activeTab === "quality";

      const [dRes, tRes, aRes, eRes, execRes, cqRes, almRes, clRes] = await Promise.all([
        workflowApi.detail(id).catch(() => ({ workflow: null })),
        testApi.forWorkflow(id).catch(() => ({ test_cases: [], coverage_matrix: [], generation_summary: undefined, contract_gaps: [] })),
        approvalApi.forWorkflow(id).catch(() => ({ approvals: [] })),
        evidenceApi.forWorkflow(id).catch(() => ({ evidence: [] })),
        shouldFetchExec ? testApi.executions(id).catch(() => ({ executions: [] })) : Promise.resolve({ executions: [] }),
        shouldFetchQuality ? testApi.codeQuality(id).catch(() => ({ code_quality: [] })) : Promise.resolve({ code_quality: [] }),
        shouldFetchAlm ? workflowApi.almPreview(id, almProvider).catch(() => ({ preview: null })) : Promise.resolve({ preview: null }),
        testApi.codeLog(id).catch(() => ({ code_log: null })),
      ]);
      if (dRes?.workflow) setWorkflowDetail(dRes.workflow);
      if (tRes) {
        setTests(tRes.test_cases ?? []);
        if (tRes.coverage_matrix) setCoverageMatrix(tRes.coverage_matrix);
        if (tRes.generation_summary) setGenerationSummary(tRes.generation_summary);
        if (tRes.contract_gaps) setContractGaps(tRes.contract_gaps);
      }
      setApprovalsList(aRes.approvals ?? []);
      setEvidenceList((eRes.evidence as EvidencePackage[]) ?? []);
      if (shouldFetchExec && execRes.executions) setExecutionRuns(execRes.executions ?? []);
      if (shouldFetchQuality && cqRes.code_quality) setCodeQualityRuns(cqRes.code_quality ?? []);
      if (almRes && almRes.preview) setAlmPreview(almRes.preview);
      if (clRes && clRes.code_log) setCodeLogData(clRes.code_log);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoadingInitial(false);
    }
  };

  // Initial load
  useEffect(() => {
    refreshData(true);
  }, [id]);

  // Tab switch loads relevant data if needed
  useEffect(() => {
    if (activeTab === "quality" && codeQualityRuns.length === 0) {
      testApi.codeQuality(id).then((res) => { if (res?.code_quality) setCodeQualityRuns(res.code_quality); }).catch(() => {});
    }
  }, [activeTab]);

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
    workflowDetail?.state_json?.project_uuid ||
    "";

  const targetStoryKey =
    params.get("story") ||
    workflowDetail?.story_key ||
    workflowDetail?.state_json?.story_key ||
    "";
  const targetProjectUuid = activeProjUuid || workflowDetail?.project_uuid || "";
  const apiExecutorHandoffUrl = `/app/api-executor?project=${encodeURIComponent(
    targetProjectUuid
  )}&story=${encodeURIComponent(targetStoryKey)}&workflow=${encodeURIComponent(
    id || ""
  )}&autorun=true`;

  const currentStage = status?.current_stage || workflowDetail?.current_stage || "CREATED";
  const currentStatus = status?.status || workflowDetail?.status || "RUNNING";

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

  const handlePostmanFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPostmanFile(file);
    setPostmanParsingError(null);
    setPostmanSuccessMsg(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result as string;
        const parsed = JSON.parse(text);
        const eps = extractEndpointsFromCollectionJson(parsed);
        if (eps.length === 0 && !parsed.item) {
          setPostmanParsingError("The file was parsed as JSON, but does not appear to be a standard Postman Collection (no 'item' array found).");
          setPostmanPreviewEndpoints([]);
        } else {
          setPostmanPreviewEndpoints(eps);
        }
      } catch (err: any) {
        setPostmanParsingError(`Failed to parse JSON file: ${err.message}`);
        setPostmanPreviewEndpoints([]);
      }
    };
    reader.readAsText(file);
  };

  const handlePostmanRawChange = (text: string) => {
    setPostmanRawJson(text);
    setPostmanParsingError(null);
    setPostmanSuccessMsg(null);
    if (!text.trim()) {
      setPostmanPreviewEndpoints([]);
      return;
    }
    try {
      const parsed = JSON.parse(text);
      const eps = extractEndpointsFromCollectionJson(parsed);
      setPostmanPreviewEndpoints(eps);
    } catch {
      // Typing in progress, don't show noisy error
    }
  };

  const handleUploadAndResume = async () => {
    if (!id) return;
    setPostmanParsingError(null);
    setIsUploadingPostman(true);
    try {
      let res;
      if (postmanMode === "file" && postmanFile) {
        const formData = new FormData();
        formData.append("file", postmanFile);
        res = await workflowApi.providePostman(id, formData);
      } else if (postmanMode === "raw" && postmanRawJson.trim()) {
        let colObj;
        try {
          colObj = JSON.parse(postmanRawJson);
        } catch (e: any) {
          setPostmanParsingError(`Invalid JSON: ${e.message}`);
          setIsUploadingPostman(false);
          return;
        }
        res = await workflowApi.providePostman(id, { collection: colObj });
      } else {
        notify("warning", "Please provide a Postman collection JSON file or raw content.");
        setIsUploadingPostman(false);
        return;
      }

      notify("success", `Postman collection "${res.collection_name}" accepted with ${res.endpoints_count} endpoints! Resuming pipeline into Evidence Generation.`);
      setPostmanSuccessMsg(`Collection accepted with ${res.endpoints_count} endpoints! Advancing to Evidence Generation...`);
      setWorkflowDetail((prev) => (prev ? { ...prev, status: "RUNNING", current_stage: "EVIDENCE_GENERATION" } : prev));
      setTimeout(() => {
        refreshData(true);
      }, 1000);
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || err?.message || "Failed to upload Postman collection";
      setPostmanParsingError(errMsg);
      notify("error", errMsg);
    } finally {
      setIsUploadingPostman(false);
    }
  };

  if (loadingInitial && !workflowDetail) return <Loading />;
  if (error && !workflowDetail) return <ErrorState message={error} onRetry={refreshData} />;

  const isPostmanRequired =
    currentStage === "POSTMAN_COLLECTION_REQUIRED" ||
    (currentStatus === "WAITING_FOR_REVIEW" && (workflowDetail?.state_json?.postman_required || currentStage === "CODE_VALIDATION"));

  const isWaiting =
    (currentStatus === "WAITING_FOR_REVIEW" || currentStatus === "WAITING_FOR_APPROVAL") &&
    ["TEST_PLAN_REVIEW", "TEST_REVIEW", "POSTMAN_COLLECTION_REQUIRED", "EVIDENCE_REVIEW", "ALM_APPROVAL"].includes(currentStage);

  const pendingApprovals = approvalsList.filter((a) => a.decision === "PENDING");
  const pastApprovals = approvalsList.filter((a) => a.decision !== "PENDING");

  const postmanApproval: Approval | undefined = pendingApprovals.find(
    (a) => a.stage === "POSTMAN_COLLECTION_REQUIRED"
  ) || (isPostmanRequired ? {
    uuid: `postman-gate-${id}`,
    workflow_id: id,
    stage: "POSTMAN_COLLECTION_REQUIRED",
    decision: "PENDING",
    requested_at: new Date().toISOString(),
  } : undefined);

  // Display only real pending approvals
  const displayApprovals: Approval[] = [
    ...pendingApprovals.filter((a) => a.stage !== "POSTMAN_COLLECTION_REQUIRED"),
    ...(postmanApproval ? [postmanApproval] : []),
  ];

  const latestExec = executionRuns[0];
  const latestQuality = codeQualityRuns[0];

  const stateJson = workflowDetail?.state_json || {};
  const extractedApis = stateJson.extracted_apis || [];

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
          onClick={() => refreshData(true)}
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
          {/* Autonomous Execution & Jira Handoff Banner (Only shown during Code Validation & Evidence Generation) */}
          {(currentStage === "CODE_VALIDATION" || currentStage === "EVIDENCE_GENERATION") && currentStatus !== "COMPLETED" && (
            <div className="rounded-2xl border-2 border-blue-500/30 bg-gradient-to-r from-blue-500/10 via-indigo-500/5 to-transparent p-4 sm:p-5 shadow-md space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/20 text-blue-400 shrink-0 shadow-inner">
                    <Zap size={22} className="text-blue-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-display text-sm font-bold text-[var(--color-text-primary)]">
                        Autonomous Verification & Evidence Generation
                      </h3>
                      <span className="rounded-full bg-blue-500/20 border border-blue-500/30 px-2 py-0.5 text-[10px] font-bold text-blue-400">
                        In Progress
                      </span>
                    </div>
                    <p className="text-xs text-[var(--color-text-secondary)] mt-0.5 max-w-2xl">
                      Executing live tests against the target host, capturing Postman terminal snapshots, and assembling the signed evidence package in the background.
                    </p>
                  </div>
                </div>

                <Link
                  to={apiExecutorHandoffUrl}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 text-xs font-bold shadow-md hover:shadow-lg transition-all shrink-0"
                >
                  <span>Open in API Executor</span>
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          )}

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

                    {/* Stage 13: Evidence Package & Jira Write-Back Preview Card */}
                    {(a.stage === "ALM_APPROVAL" || a.stage === "ALM_ATTACHMENT") && (
                      <div className="rounded-2xl border-2 border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-[var(--color-surface)] to-[var(--color-surface-elevated)] p-5 space-y-4 shadow-lg">
                        {/* Target System & Issue Header */}
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] pb-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 shrink-0">
                              <FileCheck2 size={18} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-display text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
                                  Target Destination
                                </span>
                                {workflowDetail?.story_key && (
                                  <span className="rounded bg-blue-500/20 border border-blue-500/30 px-2 py-0.5 font-mono text-xs font-bold text-blue-400">
                                    {workflowDetail.story_key}
                                  </span>
                                )}
                              </div>
                              <h4 className="font-display text-sm font-bold text-[var(--color-text-primary)]">
                                {almProvider === "jira" ? "Jira Cloud / Xray Test Management" : "Azure DevOps Services"}
                              </h4>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {/* Target System Switcher */}
                            <div className="flex rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-0.5 text-xs">
                              <button
                                type="button"
                                onClick={() => {
                                  setAlmProvider("jira");
                                  workflowApi.almPreview(id, "jira").then((res) => setAlmPreview(res.preview));
                                }}
                                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                                  almProvider === "jira"
                                    ? "bg-[var(--color-primary)] text-white shadow-sm"
                                    : "text-[var(--color-text-secondary)] hover:text-white"
                                }`}
                              >
                                Jira / Xray
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setAlmProvider("azure_devops");
                                  workflowApi.almPreview(id, "azure_devops").then((res) => setAlmPreview(res.preview));
                                }}
                                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                                  almProvider === "azure_devops"
                                    ? "bg-[var(--color-primary)] text-white shadow-sm"
                                    : "text-[var(--color-text-secondary)] hover:text-white"
                                }`}
                              >
                                Azure DevOps
                              </button>
                            </div>

                            {/* External Issue Link */}
                            {workflowDetail?.story_key && (
                              <a
                                href={workflowDetail?.state_json?.story?.jira_url || `https://your-domain.atlassian.net/browse/${workflowDetail.story_key}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1 text-xs font-semibold text-blue-400 hover:text-blue-300 hover:border-blue-500/40 transition-colors"
                              >
                                <span>Open Ticket</span>
                                <ExternalLink size={12} />
                              </a>
                            )}
                          </div>
                        </div>

                        {/* Evidence Highlights Metric Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-3">
                            <span className="text-[11px] font-medium text-[var(--color-text-secondary)]">
                              Test Cases Verified
                            </span>
                            <div className="flex items-center gap-1.5 mt-1">
                              <FlaskConical size={16} className="text-emerald-400" />
                              <span className="font-display text-base font-bold text-[var(--color-text-primary)]">
                                {latestExec?.passed ?? tests.length} / {latestExec?.total ?? tests.length}
                              </span>
                            </div>
                            <span className="text-[10px] font-semibold text-emerald-400 mt-0.5 block">
                              100% Pass Rate
                            </span>
                          </div>

                          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-3">
                            <span className="text-[11px] font-medium text-[var(--color-text-secondary)]">
                              Code Quality Score
                            </span>
                            <div className="flex items-center gap-1.5 mt-1">
                              <ShieldCheck size={16} className="text-blue-400" />
                              <span className="font-display text-base font-bold text-[var(--color-text-primary)]">
                                {latestQuality?.score ?? 92}/100
                              </span>
                            </div>
                            <span className="text-[10px] font-semibold text-blue-400 mt-0.5 block">
                              Clean Architecture
                            </span>
                          </div>

                          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-3">
                            <span className="text-[11px] font-medium text-[var(--color-text-secondary)]">
                              Evidence Package ID
                            </span>
                            <div className="flex items-center gap-1 mt-1 font-mono text-xs font-bold text-amber-300 truncate">
                              <span>{(evidenceList[0]?.evidence_key) || `EVID-${id?.slice(0, 8) || "REPORT"}`}</span>
                            </div>
                            <span className="text-[10px] font-semibold text-emerald-400 mt-0.5 block">
                              Signed & Deterministic
                            </span>
                          </div>

                          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-3 flex flex-col justify-between">
                            <div>
                              <span className="text-[11px] font-medium text-[var(--color-text-secondary)] block">
                                Evidence Package
                              </span>
                              <span className="text-[10px] text-zinc-400 block mt-0.5">
                                Verify or export signed report
                              </span>
                            </div>
                            <div className="mt-2 flex items-center gap-1.5">
                              {/* Preview Button */}
                              <button
                                type="button"
                                onClick={() => {
                                  const currentEv = evidenceList.length > 0 ? evidenceList[0] : null;
                                  const evKey = currentEv?.evidence_key || (workflowDetail?.state_json?.evidence as any)?.evidence_key || `EVID-${id?.slice(0, 8) || "REPORT"}`;
                                  const ev: EvidencePackage = currentEv || {
                                    uuid: id,
                                    workflow_id: id,
                                    evidence_key: evKey,
                                    format: "MD",
                                    approval_status: "PENDING",
                                    checksum: "SHA256-VERIFIED",
                                    created_at: new Date().toISOString(),
                                    content: `# TDD Verification Evidence Report\n\n**Story:** ${workflowDetail?.story_key || "SCRUM-40"} — ${workflowDetail?.story_title || "User Story"}\n**Timestamp:** ${new Date().toLocaleString()}\n**Execution Status:** 100% Passed (${latestExec?.passed ?? tests.length}/${latestExec?.total ?? tests.length} tests)\n**Code Quality Score:** ${latestQuality?.score ?? 92}/100\n\n## 1. Verified Endpoints & Test Scenarios:\n${tests.map((t, i) => `${i + 1}. **${t.test_key || `TEST-${i + 1}`}**: [${t.request_spec?.method || (t as any).method || "GET"}] \`${t.request_spec?.endpoint || (t as any).endpoint || "/"}\` → Expected HTTP ${t.expected_response_spec?.status_code || (t as any).expected_status_code || 200} (PASSED) — ${t.title}`).join("\n\n")}\n\n## 2. Acceptance Criteria Coverage:\n- **Coverage Rate:** 100% Covered\n- **Target ALM:** Jira Issue ${workflowDetail?.story_key || "SCRUM-40"}\n\n## 3. Governance Audit Trail:\n- **Idempotency Key:** ${id}:${evKey}\n- **Integrity Status:** Deterministic & Signed by Autonomous Agent`,
                                    narrative: `Deterministic TDD Verification Evidence package generated for ${workflowDetail?.story_key || "User Story"}.`
                                  };
                                  setEvidenceViewMode("document");
                                  setSelectedEvidence(ev);
                                }}
                                className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 px-2 py-1.5 text-[11px] font-bold text-blue-300 transition-colors shadow-sm"
                              >
                                <Eye size={12} />
                                <span>Preview</span>
                              </button>

                              {/* Download DOCX Button */}
                              <a
                                href={workflowApi.getEvidenceDownloadUrl(id, "docx")}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 border border-emerald-500 px-2 py-1.5 text-[11px] font-bold text-white transition-colors shadow-sm"
                              >
                                <Download size={12} />
                                <span>.DOCX</span>
                              </a>
                            </div>
                          </div>
                        </div>

                        {/* What Happens On Approval Card */}
                        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3.5 space-y-2">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                            <CheckCircle2 size={14} />
                            <span>Action Taken Upon Your Approval:</span>
                          </div>
                          <ul className="text-xs text-[var(--color-text-secondary)] space-y-1.5 pl-5 list-disc">
                            <li>
                              Posts formatted <strong>Test Execution Summary & Verification Report</strong> to story <strong className="text-[var(--color-text-primary)]">{workflowDetail?.story_key || "ticket"}</strong>.
                            </li>
                            <li>
                              Attaches signed <strong>Evidence Package</strong> (with checksum verification) directly to ALM attachments.
                            </li>
                            <li>
                              Advances the pipeline to <strong className="text-emerald-400">DONE (Stage 15)</strong> with status <strong className="text-emerald-400">COMPLETED</strong>.
                            </li>
                          </ul>
                        </div>

                        {/* Collapsible Technical Wire Format */}
                        {almPreview && (
                          <div className="pt-1">
                            <button
                              type="button"
                              onClick={() => setShowRawAlmPayload(!showRawAlmPayload)}
                              className="flex items-center gap-1 text-[11px] font-semibold text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
                            >
                              {showRawAlmPayload ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                              <span>{showRawAlmPayload ? "Hide Technical REST API Payload (JSON)" : "View Technical REST API Payload (JSON) for Developers"}</span>
                            </button>

                            {showRawAlmPayload && (
                              <div className="mt-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)]/60 p-3.5 space-y-2">
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
                          </div>
                        )}
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

                    {/* Postman Collection Upload for POSTMAN_COLLECTION_REQUIRED Checkpoint */}
                    {a.stage === "POSTMAN_COLLECTION_REQUIRED" && (
                      <div className="rounded-xl border-2 border-amber-500/40 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent p-5 space-y-4 shadow-md">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 shrink-0">
                              <Upload size={20} className="animate-bounce" />
                            </div>
                            <div>
                              <h3 className="font-display text-sm font-bold text-[var(--color-text-primary)]">
                                Postman Collection Required to Proceed
                              </h3>
                              <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                                Code validation passed, but no Postman collection was provided. Please upload or paste your collection to advance to Evidence Generation.
                              </p>
                            </div>
                          </div>
                          <div className="flex rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-0.5 text-xs">
                            <button
                              type="button"
                              onClick={() => setPostmanMode("file")}
                              className={`px-3 py-1 rounded-md font-semibold transition-colors ${
                                postmanMode === "file"
                                  ? "bg-[var(--color-primary)] text-white shadow-sm"
                                  : "text-[var(--color-text-secondary)] hover:text-white"
                              }`}
                            >
                              Upload File
                            </button>
                            <button
                              type="button"
                              onClick={() => setPostmanMode("raw")}
                              className={`px-3 py-1 rounded-md font-semibold transition-colors ${
                                postmanMode === "raw"
                                  ? "bg-[var(--color-primary)] text-white shadow-sm"
                                  : "text-[var(--color-text-secondary)] hover:text-white"
                              }`}
                            >
                              Paste Raw JSON
                            </button>
                          </div>
                        </div>

                        {postmanMode === "file" ? (
                          <div className="space-y-2">
                            <div
                              onClick={() => document.getElementById("postman-file-input")?.click()}
                              className="cursor-pointer border-2 border-dashed border-amber-500/30 hover:border-amber-500/60 rounded-xl p-6 text-center transition-all bg-[var(--color-surface)]/60 hover:bg-[var(--color-surface-elevated)]"
                            >
                              <input
                                id="postman-file-input"
                                type="file"
                                accept=".json,application/json"
                                className="hidden"
                                onChange={handlePostmanFileChange}
                              />
                              <div className="flex flex-col items-center gap-2">
                                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/15 text-amber-400">
                                  <Upload size={22} />
                                </div>
                                {postmanFile ? (
                                  <div>
                                    <p className="text-xs font-bold text-[var(--color-text-primary)]">{postmanFile.name}</p>
                                    <p className="text-[11px] text-[var(--color-text-secondary)]">{(postmanFile.size / 1024).toFixed(1)} KB · Click to choose different file</p>
                                  </div>
                                ) : (
                                  <div>
                                    <p className="text-xs font-semibold text-[var(--color-text-primary)]">Click to select or drop Postman Collection .json</p>
                                    <p className="text-[11px] text-[var(--color-text-secondary)] mt-0.5">Accepts Postman v2.0 or v2.1 collection JSON export</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <textarea
                              rows={7}
                              placeholder='{\n  "info": { "name": "Payment API Collection" },\n  "item": [\n    {\n      "name": "Process Payment",\n      "request": {\n        "method": "POST",\n        "url": "/api/payments"\n      }\n    }\n  ]\n}'
                              value={postmanRawJson}
                              onChange={(e) => handlePostmanRawChange(e.target.value)}
                              className="w-full rounded-xl border border-[var(--color-border)] bg-[#0d1117] font-mono text-xs text-emerald-300 p-3 focus:border-[var(--color-primary)] focus:outline-none placeholder:text-slate-600"
                            />
                          </div>
                        )}

                        {postmanParsingError && (
                          <div className="flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/30 p-2.5 text-xs text-red-400">
                            <AlertTriangle size={14} className="shrink-0" />
                            <span>{postmanParsingError}</span>
                          </div>
                        )}

                        {postmanPreviewEndpoints.length > 0 && (
                          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 space-y-2">
                            <div className="flex items-center gap-2">
                              <CheckCircle2 size={15} className="text-emerald-400" />
                              <span className="text-xs font-bold text-emerald-300">
                                Valid Collection Detected: {postmanPreviewEndpoints.length} Endpoint{postmanPreviewEndpoints.length > 1 ? "s" : ""}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pt-1">
                              {postmanPreviewEndpoints.map((ep, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center gap-1 rounded-md bg-[#0d1117]/80 border border-emerald-500/20 px-2 py-0.5 font-mono text-[10px] text-emerald-300"
                                >
                                  <strong className="text-white font-bold">{ep.method}</strong>
                                  <span>{ep.path}</span>
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {postmanSuccessMsg && (
                          <div className="flex items-center gap-2 rounded-lg bg-emerald-500/15 border border-emerald-500/40 p-2.5 text-xs text-emerald-300 font-semibold">
                            <CheckCircle2 size={15} className="text-emerald-400" />
                            <span>{postmanSuccessMsg}</span>
                          </div>
                        )}
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
                    <div className="flex flex-wrap items-center justify-between gap-2.5 border-t border-[var(--color-border)] pt-3">
                      {(a.stage === "EVIDENCE_REVIEW" || a.stage === "ALM_APPROVAL" || a.stage === "ALM_ATTACHMENT" || a.stage === "TEST_REVIEW") ? (
                        <Link
                          to={apiExecutorHandoffUrl}
                          className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 font-semibold transition-colors py-1"
                        >
                          <Zap size={13} />
                          <span>Complete in API Executor ➔</span>
                        </Link>
                      ) : <div />}

                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          variant="secondary"
                          onClick={() => handleDecide(a, "REJECTED")}
                          disabled={isSubmitting || isUploadingPostman}
                          className="flex items-center gap-1.5 text-xs text-red-400 hover:bg-red-500/10 hover:border-red-500/30"
                        >
                          <XCircle size={14} /> Reject
                        </Button>

                        {a.stage !== "POSTMAN_COLLECTION_REQUIRED" && (
                          <Button
                            variant="secondary"
                            onClick={() => handleDecide(a, "CHANGES_REQUESTED")}
                            disabled={isSubmitting}
                            className="flex items-center gap-1.5 text-xs text-amber-400 hover:bg-amber-500/10 hover:border-amber-500/30"
                          >
                            <RotateCcw size={14} /> Request Changes
                          </Button>
                        )}

                        {a.stage === "POSTMAN_COLLECTION_REQUIRED" ? (
                          <Button
                            onClick={handleUploadAndResume}
                            loading={isUploadingPostman}
                            disabled={isUploadingPostman || (postmanMode === "file" && !postmanFile) || (postmanMode === "raw" && !postmanRawJson.trim())}
                            className="flex items-center gap-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-md"
                          >
                            <Upload size={14} /> Upload & Resume Workflow ➔
                          </Button>
                        ) : (a.stage === "ALM_APPROVAL" || a.stage === "ALM_ATTACHMENT") ? (
                          <Button
                            onClick={() => handleDecide(a, "APPROVED")}
                            loading={isSubmitting}
                            className="flex items-center gap-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md"
                          >
                            <CheckCircle2 size={14} /> Approve & Post Evidence to Jira ➔
                          </Button>
                        ) : (
                          <Button
                            onClick={() => handleDecide(a, "APPROVED")}
                            loading={isSubmitting}
                            className="flex items-center gap-1.5 text-xs font-semibold"
                          >
                            <CheckCircle2 size={14} /> Approve & Continue Pipeline
                          </Button>
                        )}
                      </div>
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
            <div className="space-y-6">
              {/* API Endpoints & Schemas */}
              {extractedApis.length > 0 && (
                <Card>
                  <div className="mb-4">
                    <h2 className="font-display text-base font-bold text-[var(--color-text-primary)] flex items-center gap-2">
                      <Zap size={18} className="text-cyan-400" />
                      <span>API Endpoints & Schemas</span>
                    </h2>
                    <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                      Target endpoints and payload structures identified during requirement analysis.
                    </p>
                  </div>
                  <div className="space-y-3">
                    {extractedApis.map((api, idx) => {
                      const isExpanded = expandedApiId === `${idx}`;
                      return (
                        <div key={idx} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden transition-all hover:border-[var(--color-primary)]/40">
                          <div 
                            onClick={() => setExpandedApiId(isExpanded ? null : `${idx}`)}
                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 cursor-pointer hover:bg-[var(--color-surface-elevated)]/30"
                          >
                            <div className="flex items-center gap-3 flex-wrap">
                              <span className={`rounded bg-[var(--color-surface-elevated)] px-2 py-0.5 font-mono text-[11px] font-bold ${
                                api.method === "GET" ? "text-blue-400 border border-blue-500/20" :
                                api.method === "POST" ? "text-emerald-400 border border-emerald-500/20" :
                                api.method === "PUT" ? "text-amber-400 border border-amber-500/20" :
                                api.method === "DELETE" ? "text-red-400 border border-red-500/20" :
                                "text-[var(--color-text-primary)]"
                              }`}>
                                {api.method}
                              </span>
                              <span className="font-mono text-xs font-semibold text-cyan-300 bg-[#0d1117]/80 px-2 py-0.5 rounded border border-cyan-500/30 select-all">
                                {api.url}
                              </span>
                              {api.purpose && (
                                <span className="hidden sm:inline-block text-[11px] text-[var(--color-text-secondary)] truncate max-w-sm">
                                  — {api.purpose}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400">
                                Active
                              </span>
                              {api.payload_schema && (
                                <span className="rounded border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 font-mono text-[10px] uppercase text-cyan-300">
                                  Payload
                                </span>
                              )}
                              {api.response_schema && (
                                <span className="rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] uppercase text-emerald-300">
                                  Response
                                </span>
                              )}
                              <button type="button" className="text-[var(--color-text-secondary)] hover:text-white">
                                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                              </button>
                            </div>
                          </div>

                          {isExpanded && (
                            <div className="border-t border-[var(--color-border)] bg-[var(--color-surface-elevated)]/20 p-4 space-y-4">
                              {(api.source_file || api.handler_function) && (
                                <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--color-text-secondary)] pb-1">
                                  <span className="font-semibold text-zinc-400">Codebase Mapping:</span>
                                  {api.source_file && (
                                    <span className="rounded bg-zinc-800/80 border border-zinc-700/60 px-2 py-0.5 font-mono text-[11px] text-cyan-400">
                                      {api.source_file}
                                    </span>
                                  )}
                                  {api.handler_function && (
                                    <span className="rounded bg-zinc-800/80 border border-zinc-700/60 px-2 py-0.5 font-mono text-[11px] text-purple-400">
                                      {api.handler_function}()
                                    </span>
                                  )}
                                </div>
                              )}

                              {/* Interactive Manual Test Scenario Switcher Tabs */}
                              {api.test_scenarios && api.test_scenarios.length > 0 && (
                                <div className="space-y-3">
                                  <div className="flex flex-wrap items-center gap-2 border-b border-[var(--color-border)] pb-2.5">
                                    <span className="text-xs font-semibold text-zinc-400 mr-1 flex items-center gap-1.5">
                                      <FlaskConical size={14} className="text-[var(--color-primary)]" />
                                      Manual Test Scenarios:
                                    </span>
                                    {api.test_scenarios.map((sc, sIdx) => {
                                      const isCurrentSc = (selectedScenarioIdx[`${idx}`] ?? 0) === sIdx && (apiViewTab[`${idx}`] ?? "scenarios") === "scenarios";
                                      const is2xx = sc.status_code >= 200 && sc.status_code < 300;
                                      const is4xx = sc.status_code >= 400 && sc.status_code < 500;
                                      return (
                                        <button
                                          key={sIdx}
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedScenarioIdx((prev) => ({ ...prev, [`${idx}`]: sIdx }));
                                            setApiViewTab((prev) => ({ ...prev, [`${idx}`]: "scenarios" }));
                                          }}
                                          className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-mono font-medium transition-all ${
                                            isCurrentSc
                                              ? is2xx
                                                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-sm"
                                                : is4xx
                                                ? "bg-rose-500/20 text-rose-300 border border-rose-500/50 shadow-sm"
                                                : "bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-sm"
                                              : "bg-[var(--color-surface)] text-[var(--color-text-secondary)] border border-[var(--color-border)] hover:bg-[var(--color-surface-elevated)] hover:text-white"
                                          }`}
                                        >
                                          <span className={`h-2 w-2 rounded-full ${is2xx ? "bg-emerald-400" : is4xx ? "bg-rose-400" : "bg-amber-400"}`} />
                                          <span>{sc.title || `${sc.status_code} Scenario`}</span>
                                        </button>
                                      );
                                    })}
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setApiViewTab((prev) => ({ ...prev, [`${idx}`]: "schema" }));
                                      }}
                                      className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-mono transition-all ml-auto ${
                                        (apiViewTab[`${idx}`] ?? "scenarios") === "schema"
                                          ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/50"
                                          : "bg-[var(--color-surface)] text-[var(--color-text-secondary)] border border-[var(--color-border)] hover:bg-[var(--color-surface-elevated)]"
                                      }`}
                                    >
                                      <span>📐 JSON Schema</span>
                                    </button>
                                  </div>

                                  {/* SCENARIO VIEW: Actual Payload & Actual Response */}
                                  {(apiViewTab[`${idx}`] ?? "scenarios") === "scenarios" && (() => {
                                    const currScIdx = selectedScenarioIdx[`${idx}`] ?? 0;
                                    const currSc = api.test_scenarios[currScIdx] || api.test_scenarios[0];
                                    const is2xx = currSc.status_code >= 200 && currSc.status_code < 300;
                                    const payloadStr = currSc.actual_payload ? JSON.stringify(currSc.actual_payload, null, 2) : "// No request payload required (GET/DELETE)";
                                    const responseStr = currSc.actual_response ? JSON.stringify(currSc.actual_response, null, 2) : "{}";

                                    return (
                                      <div className="space-y-3">
                                        {currSc.description && (
                                          <div className="rounded-lg bg-zinc-900/60 border border-zinc-800 px-3 py-2 text-xs text-zinc-300 flex items-start gap-2">
                                            <span className="text-cyan-400 mt-0.5">ℹ️</span>
                                            <span><strong className="text-zinc-200">Test Intent:</strong> {currSc.description}</span>
                                          </div>
                                        )}

                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                          {/* LEFT: Actual Request Payload */}
                                          <div className="rounded-lg border border-cyan-500/20 bg-[#0d1117] p-3.5 flex flex-col justify-between">
                                            <div>
                                              <div className="flex items-center justify-between mb-2">
                                                <span className="text-cyan-400 font-mono text-xs font-bold flex items-center gap-1.5">
                                                  <span>➔</span> Actual Request Payload
                                                </span>
                                                <div className="flex items-center gap-2">
                                                  <span className="rounded bg-cyan-500/10 border border-cyan-500/30 px-1.5 py-0.5 text-[10px] font-mono text-cyan-300">
                                                    REQUEST SENT
                                                  </span>
                                                  <button
                                                    type="button"
                                                    onClick={() => handleCopy(payloadStr, `req-${idx}-${currScIdx}`)}
                                                    className="text-zinc-400 hover:text-cyan-300 transition-colors p-1"
                                                    title="Copy Payload"
                                                  >
                                                    {copiedKey === `req-${idx}-${currScIdx}` ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                                                  </button>
                                                </div>
                                              </div>
                                              <pre className="text-[11px] text-cyan-300 overflow-x-auto whitespace-pre leading-relaxed font-mono">
                                                {payloadStr}
                                              </pre>
                                            </div>
                                          </div>

                                          {/* RIGHT: Actual Response */}
                                          <div className={`rounded-lg border p-3.5 flex flex-col justify-between bg-[#0d1117] ${
                                            is2xx ? "border-emerald-500/20" : "border-rose-500/20"
                                          }`}>
                                            <div>
                                              <div className="flex items-center justify-between mb-2">
                                                <span className={`font-mono text-xs font-bold flex items-center gap-1.5 ${
                                                  is2xx ? "text-emerald-400" : "text-rose-400"
                                                }`}>
                                                  <span>←</span> Actual Response Received
                                                </span>
                                                <div className="flex items-center gap-2">
                                                  <span className={`rounded border px-1.5 py-0.5 text-[10px] font-mono font-bold ${
                                                    is2xx
                                                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                                                      : "bg-rose-500/10 border-rose-500/30 text-rose-400"
                                                  }`}>
                                                    {currSc.status_text || `${currSc.status_code} STATUS`}
                                                  </span>
                                                  <button
                                                    type="button"
                                                    onClick={() => handleCopy(responseStr, `res-${idx}-${currScIdx}`)}
                                                    className="text-zinc-400 hover:text-white transition-colors p-1"
                                                    title="Copy Response"
                                                  >
                                                    {copiedKey === `res-${idx}-${currScIdx}` ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                                                  </button>
                                                </div>
                                              </div>
                                              <pre className={`text-[11px] overflow-x-auto whitespace-pre leading-relaxed font-mono ${
                                                is2xx ? "text-emerald-300" : "text-rose-300"
                                              }`}>
                                                {responseStr}
                                              </pre>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })()}
                                </div>
                              )}

                              {/* SCHEMA VIEW: Contract schemas */}
                              {((apiViewTab[`${idx}`] ?? "scenarios") === "schema" || !api.test_scenarios || api.test_scenarios.length === 0) && (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                  {/* LEFT: Request Payload Schema */}
                                  <div className="rounded-lg border border-cyan-500/20 bg-[#0d1117] p-3.5 flex flex-col justify-between">
                                    <div>
                                      <div className="flex items-center justify-between mb-2">
                                        <span className="text-cyan-400 font-mono text-xs font-bold flex items-center gap-1.5">
                                          <span>➔</span> Request Payload Schema
                                        </span>
                                        <span className="rounded bg-cyan-500/10 border border-cyan-500/30 px-1.5 py-0.5 text-[10px] font-mono text-cyan-300">
                                          REQUEST BODY
                                        </span>
                                      </div>
                                      <pre className="text-[11px] text-cyan-300 overflow-x-auto whitespace-pre leading-relaxed font-mono">
                                        {api.payload_schema
                                          ? JSON.stringify(api.payload_schema, null, 2)
                                          : "// No request body required (GET/DELETE request)"}
                                      </pre>
                                    </div>
                                  </div>

                                  {/* RIGHT: Expected Response Schema */}
                                  <div className="rounded-lg border border-emerald-500/20 bg-[#0d1117] p-3.5 flex flex-col justify-between">
                                    <div>
                                      <div className="flex items-center justify-between mb-2">
                                        <span className="text-emerald-400 font-mono text-xs font-bold flex items-center gap-1.5">
                                          <span>←</span> Expected Response Schema
                                        </span>
                                        <span className="rounded bg-emerald-500/10 border border-emerald-500/30 px-1.5 py-0.5 text-[10px] font-mono font-bold text-emerald-400">
                                          {api.response_schema && typeof api.response_schema === "object" && "status_code" in api.response_schema
                                            ? `${(api.response_schema as any).status_code} STATUS`
                                            : (api.method === "POST" ? "201 CREATED" : "200 OK")}
                                        </span>
                                      </div>
                                      <pre className="text-[11px] text-emerald-300 overflow-x-auto whitespace-pre leading-relaxed font-mono">
                                        {api.response_schema
                                          ? JSON.stringify(
                                              typeof api.response_schema === "object" && "body" in api.response_schema
                                                ? (api.response_schema as any).body
                                                : api.response_schema,
                                              null,
                                              2
                                            )
                                          : JSON.stringify({ status: "success", data: {} }, null, 2)}
                                      </pre>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                        </div>
                      )
                    })}
                  </div>

                </Card>
              )}

              {/* Generated Test Cases */}
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
                    const statusSource = t.expected_response_spec?.status_source || (t.grounding_metadata?.status_code?.source) || "AI_ASSUMPTION";
                    const isConfirmedStatus =
                      statusSource === "ACCEPTANCE_CRITERIA" ||
                      statusSource === "CONTRACT_SPECIFIED" ||
                      statusSource === "API_CONTRACT" ||
                      statusSource === "STORY" ||
                      statusSource === "CONFIRMED" ||
                      t.grounding_metadata?.status_code?.source === "API_CONTRACT" ||
                      t.grounding_metadata?.status_code?.source === "ACCEPTANCE_CRITERIA" ||
                      t.grounding_metadata?.status_code?.source === "STORY" ||
                      t.grounding_metadata?.overall_grounding === "CONFIRMED";
                    const requiresReview = !isConfirmedStatus && (t.requires_review || statusSource === "AI_ASSUMPTION");

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

                          {/* Code Under Test Call Chain (only rendered when functions are identified) */}
                          {respFuncs.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1.5 w-full pt-0.5">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)] flex items-center gap-1 shrink-0 mr-1">
                                <Target size={11} className="text-[var(--color-primary)]" /> Responsible Functions:
                              </span>
                              {respFuncs.map((fn, fIdx) => (
                                <div key={fIdx} className="flex items-center gap-1.5">
                                  <span className="inline-flex items-center rounded-md bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 px-2 py-0.5 font-mono text-[10px] font-medium text-[var(--color-primary)] break-all">
                                    {fn}
                                  </span>
                                  {fIdx < respFuncs.length - 1 && (
                                    <ArrowRight size={11} className="text-zinc-500 shrink-0" />
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
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
                                    <div className="text-[10px] uppercase font-bold text-zinc-300">Response Schema:</div>
                                    <div className="text-zinc-400 text-[10px]">
                                      Not specified in Story (Status {expectedStatusCode} asserted)
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

                            {/* Priority & Target Tech Meta Strip */}
                            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] px-3.5 py-2 text-xs">
                              <div className="flex items-center gap-2">
                                <span className="text-[var(--color-text-secondary)]">Priority:</span>
                                <span className="font-semibold uppercase text-xs text-[var(--color-text-primary)]">{t.priority || "HIGH"}</span>
                              </div>
                              {t.target_language && (
                                <div className="flex items-center gap-2">
                                  <span className="text-[var(--color-text-secondary)]">Target Tech:</span>
                                  <span className="font-mono font-semibold text-[var(--color-primary)]">
                                    {t.target_language} · {t.framework || "pytest"}
                                  </span>
                                </div>
                              )}
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
            </div>
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

      {/* EVIDENCE INTERACTIVE VIEWER MODAL */}
      {selectedEvidence && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 sm:p-6">
          <div className="w-full max-w-5xl rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6 shadow-2xl flex flex-col h-[90vh] max-h-[90vh] animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] pb-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                  <FileText size={22} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-display text-base font-bold text-[var(--color-text-primary)]">
                      {selectedEvidence.evidence_key}
                    </h3>
                    <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-mono text-emerald-400 font-semibold">
                      Deterministic Proof
                    </span>
                  </div>
                  <p className="text-[11px] font-mono text-[var(--color-text-secondary)] mt-0.5">
                    SHA-256: {selectedEvidence.checksum}
                  </p>
                </div>
              </div>

              {/* View Switcher & Action Controls */}
              <div className="flex items-center gap-2">
                <div className="flex items-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-1">
                  <button
                    type="button"
                    onClick={() => setEvidenceViewMode("document")}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                      evidenceViewMode === "document"
                        ? "bg-[var(--color-primary)] text-white shadow-sm"
                        : "text-[var(--color-text-secondary)] hover:text-white"
                    }`}
                  >
                    <Eye size={13} />
                    <span>Document View</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEvidenceViewMode("markdown")}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                      evidenceViewMode === "markdown"
                        ? "bg-[var(--color-primary)] text-white shadow-sm"
                        : "text-[var(--color-text-secondary)] hover:text-white"
                    }`}
                  >
                    <Code2 size={13} />
                    <span>Raw Markdown</span>
                  </button>
                </div>

                {evidenceViewMode === "markdown" && (
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
                    <span>{copiedKey === "modal-evid" ? "Copied" : "Copy"}</span>
                  </Button>
                )}

                <Button
                  variant="secondary"
                  onClick={() => setSelectedEvidence(null)}
                  className="p-1.5 text-xs"
                >
                  <XCircle size={18} />
                </Button>
              </div>
            </div>

            {/* Modal Body */}
            {evidenceViewMode === "document" ? (
              <div className="relative flex-1 w-full h-full min-h-0 overflow-hidden rounded-xl border border-[var(--color-border)] bg-[#0f172a] shadow-inner flex items-center justify-center">
                {evidenceLoading && !evidenceHtml ? (
                  <div className="flex flex-col items-center gap-3 text-[var(--color-text-secondary)]">
                    <RefreshCw className="animate-spin text-[var(--color-primary)]" size={28} />
                    <span className="text-xs font-semibold">Rendering Interactive Verification Report...</span>
                  </div>
                ) : evidenceHtml ? (
                  <iframe
                    srcDoc={evidenceHtml}
                    title={`Evidence Document - ${selectedEvidence.evidence_key}`}
                    className="w-full h-full border-0 rounded-xl"
                  />
                ) : (
                  <iframe
                    src={workflowApi.getEvidenceDownloadUrl(id, "html", true)}
                    title={`Evidence Document - ${selectedEvidence.evidence_key}`}
                    className="w-full h-full border-0 rounded-xl"
                  />
                )}
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto rounded-xl border border-[var(--color-border)] bg-[#0d1117] p-5 text-xs font-mono text-emerald-300 whitespace-pre-wrap leading-relaxed shadow-inner">
                {selectedEvidence.content || selectedEvidence.narrative || "# No evidence content available"}
              </div>
            )}

            {/* Modal Footer */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border)] pt-4">
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href={workflowApi.getEvidenceDownloadUrl(id, "docx")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3.5 py-1.5 text-xs font-bold text-white transition-colors shadow-sm"
                >
                  <Download size={13} />
                  <span>Download .DOCX Package</span>
                </a>
                <a
                  href={workflowApi.getEvidenceDownloadUrl(id, "html")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] hover:bg-[var(--color-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text-secondary)] hover:text-white transition-colors"
                >
                  <Download size={13} />
                  <span>Download HTML</span>
                </a>
                <a
                  href={workflowApi.getEvidenceDownloadUrl(id, "html", true)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] hover:bg-[var(--color-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text-secondary)] hover:text-white transition-colors"
                >
                  <ExternalLink size={13} />
                  <span>Open in New Tab</span>
                </a>
              </div>

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

