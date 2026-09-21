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
import { WorkflowStepper } from "@/components/workflow/WorkflowStepper";
import { Loading, ErrorState } from "@/components/ui/Loading";
import { useToast } from "@/contexts/ToastContext";
import type {
  TestCase,
  Approval,
  WorkflowRun,
  ExecutionRun,
  EvidencePackage,
  AlmPreview,
  CodeLog,
  CoverageMatrixItem,
  GenerationSummary,
  ContractGap,
} from "@/types";
import {
  ArrowLeft,
  RefreshCw,
  FlaskConical,
  Zap,
  CheckCircle2,
  UserCheck,
  ArrowRight,
} from "lucide-react";

import { WorkflowGovernanceCard } from "./components/WorkflowGovernanceCard";
import { WorkflowTestsTab } from "./components/WorkflowTestsTab";
import { WorkflowCoverageTab } from "./components/WorkflowCoverageTab";
import { WorkflowEvidenceModal } from "./components/WorkflowEvidenceModal";

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
  const [almPreview, setAlmPreview] = useState<AlmPreview | null>(null);
  const [codeLogData, setCodeLogData] = useState<CodeLog | null>(null);
  const [showCodeLog, setShowCodeLog] = useState(true);
  const [showTestCases, setShowTestCases] = useState(true);
  const [showCoverageMatrix, setShowCoverageMatrix] = useState(true);
  const [almProvider, setAlmProvider] = useState<"azure_devops" | "jira">("jira");
  const [showRawAlmPayload, setShowRawAlmPayload] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active Tab: Tests, Code Coverage, History
  const [activeTab, setActiveTab] = useState<"tests" | "coverage" | "history">("tests");

  // Expanded items state
  const [expandedTestUuid, setExpandedTestUuid] = useState<string | null>(null);
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

      const [dRes, tRes, aRes, eRes, execRes, almRes, clRes] = await Promise.all([
        workflowApi.detail(id).catch(() => ({ workflow: null })),
        testApi.forWorkflow(id).catch(() => ({ test_cases: [], coverage_matrix: [], generation_summary: undefined, contract_gaps: [] })),
        approvalApi.forWorkflow(id).catch(() => ({ approvals: [] })),
        evidenceApi.forWorkflow(id).catch(() => ({ evidence: [] })),
        shouldFetchExec ? testApi.executions(id).catch(() => ({ executions: [] })) : Promise.resolve({ executions: [] }),
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
      if (almRes && almRes.preview) setAlmPreview(almRes.preview);
      if (clRes && clRes.code_log) setCodeLogData(clRes.code_log);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoadingInitial(false);
    }
  };

  useEffect(() => {
    refreshData(true);
  }, [id]);

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
      // Typing in progress
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

  const handleTestStatusChange = async (uuid: string, newStatus: string) => {
    try {
      await testApi.setStatus(uuid, newStatus);
      setTests((prev) =>
        prev.map((t) => (t.uuid === uuid ? { ...t, status: newStatus } : t))
      );
      notify("success", `Test case marked as ${newStatus}`);
    } catch (e) {
      notify("error", (e as Error).message);
    }
  };

  if (loadingInitial && !workflowDetail) return <Loading />;
  if (error && !workflowDetail) return <ErrorState message={error} onRetry={refreshData} />;

  const isPostmanRequired =
    currentStage === "POSTMAN_COLLECTION_REQUIRED" ||
    (currentStatus === "WAITING_FOR_REVIEW" && (workflowDetail?.state_json?.postman_required || currentStage === "CODE_VALIDATION"));

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

  const displayApprovals: Approval[] = [
    ...pendingApprovals.filter((a) => a.stage !== "POSTMAN_COLLECTION_REQUIRED"),
    ...(postmanApproval ? [postmanApproval] : []),
  ];

  const latestExec = executionRuns[0];
  const stateJson = workflowDetail?.state_json || {};
  const extractedApis = stateJson.extracted_apis || [];
  const stateRealCoverage = stateJson.real_code_coverage || (stateJson.execution as any)?.real_code_coverage;
  const totalAcs = generationSummary?.acceptance_criteria_total ?? coverageMatrix.length;
  const coveredAcs = generationSummary?.acceptance_criteria_covered ?? coverageMatrix.filter((c) => c.covered).length;
  const hasAcsMapped = totalAcs > 0;
  const coveragePct = hasAcsMapped
    ? (generationSummary?.coverage_pct ?? Math.round((coveredAcs / totalAcs) * 100))
    : 0;

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
          {/* Autonomous Execution Banner */}
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
                        Autonomous Verification &amp; Evidence Generation
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

          {/* Subcomponent 1: Human Governance Checkpoint Banner */}
          <WorkflowGovernanceCard
            approvals={displayApprovals}
            comments={comments}
            onCommentChange={(uuid, text) => setComments((prev) => ({ ...prev, [uuid]: text }))}
            onDecide={handleDecide}
            submittingUuid={submittingUuid}
            testsCount={tests.length}
            evidenceList={evidenceList}
            workflowDetail={workflowDetail}
            latestExec={latestExec}
            stateRealCoverage={stateRealCoverage}
            coveragePct={coveragePct}
            almProvider={almProvider}
            onAlmProviderChange={(prov) => {
              setAlmProvider(prov);
              workflowApi.almPreview(id, prov).then((res) => setAlmPreview(res.preview));
            }}
            almPreview={almPreview}
            showRawAlmPayload={showRawAlmPayload}
            onToggleRawAlmPayload={() => setShowRawAlmPayload(!showRawAlmPayload)}
            onInspectEvidence={(ev) => {
              setEvidenceViewMode("document");
              setSelectedEvidence(ev);
            }}
            apiExecutorHandoffUrl={apiExecutorHandoffUrl}
            workflowId={id}
            postmanMode={postmanMode}
            onPostmanModeChange={setPostmanMode}
            postmanFile={postmanFile}
            postmanRawJson={postmanRawJson}
            onPostmanFileChange={handlePostmanFileChange}
            onPostmanRawChange={handlePostmanRawChange}
            postmanParsingError={postmanParsingError}
            postmanPreviewEndpoints={postmanPreviewEndpoints}
            isUploadingPostman={isUploadingPostman}
            postmanSuccessMsg={postmanSuccessMsg}
            onUploadPostmanAndResume={handleUploadAndResume}
          />

          {/* Interactive Navigation Tabs Header */}
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
              onClick={() => setActiveTab("coverage")}
              className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
                activeTab === "coverage"
                  ? "bg-[var(--color-primary)] text-white shadow-md shadow-[var(--color-primary)]/20"
                  : "bg-[var(--color-surface-elevated)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              <CheckCircle2 size={14} />
              <span>Coverage &amp; Traceability</span>
              <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                stateRealCoverage?.line_coverage_pct != null
                  ? "bg-emerald-500/20 text-emerald-300"
                  : hasAcsMapped
                  ? "bg-emerald-500/15 text-emerald-400"
                  : "bg-white/10 text-zinc-400"
              }`}>
                {stateRealCoverage?.line_coverage_pct != null
                  ? `${stateRealCoverage.line_coverage_pct}% Code`
                  : hasAcsMapped
                  ? `${coveredAcs}/${totalAcs} ACs`
                  : "Pending"}
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

          {/* Subcomponent 2: Tab 1 — Generated Test Cases & Code */}
          {activeTab === "tests" && (
            <WorkflowTestsTab
              extractedApis={extractedApis}
              expandedApiId={expandedApiId}
              onToggleExpandApi={setExpandedApiId}
              selectedScenarioIdx={selectedScenarioIdx}
              onSelectScenario={(apiIdx, sIdx) => setSelectedScenarioIdx((prev) => ({ ...prev, [apiIdx]: sIdx }))}
              apiViewTab={apiViewTab}
              onSelectApiViewTab={(apiIdx, tab) => setApiViewTab((prev) => ({ ...prev, [apiIdx]: tab }))}
              showTestCases={showTestCases}
              onToggleShowTestCases={() => setShowTestCases(!showTestCases)}
              tests={tests}
              expandedTestUuid={expandedTestUuid}
              onToggleExpandTest={setExpandedTestUuid}
              generationSummary={generationSummary}
              coverageMatrix={coverageMatrix}
              showCoverageMatrix={showCoverageMatrix}
              onToggleShowCoverageMatrix={() => setShowCoverageMatrix(!showCoverageMatrix)}
              contractGaps={contractGaps}
              codeLogData={codeLogData}
              showCodeLog={showCodeLog}
              onToggleShowCodeLog={() => setShowCodeLog(!showCodeLog)}
              onTestStatusChange={handleTestStatusChange}
              onCopy={handleCopy}
              copiedKey={copiedKey}
              workflowDetail={workflowDetail}
            />
          )}

          {/* Subcomponent 3: Tab 2 — Code Coverage & Traceability */}
          {activeTab === "coverage" && (
            <WorkflowCoverageTab
              stateRealCoverage={stateRealCoverage}
              coveragePct={coveragePct}
              totalAcs={totalAcs}
              coveredAcs={coveredAcs}
              coverageMatrix={coverageMatrix}
              tests={tests}
              onNavigateToTest={(testKey) => {
                setActiveTab("tests");
                const targetTest = tests.find((t) => t.test_key === testKey);
                if (targetTest) setExpandedTestUuid(targetTest.uuid);
              }}
            />
          )}

          {/* Tab 3: Governance & Audit Trail History */}
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

      {/* Subcomponent 4: Evidence Inspection Modal */}
      <WorkflowEvidenceModal
        selectedEvidence={selectedEvidence}
        onClose={() => setSelectedEvidence(null)}
        evidenceViewMode={evidenceViewMode}
        onViewModeChange={setEvidenceViewMode}
        evidenceLoading={evidenceLoading}
        evidenceHtml={evidenceHtml}
        workflowId={id}
        copiedKey={copiedKey}
        onCopy={handleCopy}
      />
    </div>
  );
}
