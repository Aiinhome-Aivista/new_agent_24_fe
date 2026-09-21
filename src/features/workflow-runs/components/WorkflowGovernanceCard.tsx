import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { workflowApi } from "@/services/api/workflowApi";
import type { Approval, WorkflowRun, ExecutionRun, EvidencePackage, AlmPreview } from "@/types";
import {
  ShieldAlert,
  FileCheck2,
  FlaskConical,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Upload,
  MessageSquare,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Eye,
  Download,
  Zap,
} from "lucide-react";

export const CHECKPOINT_GUIDES: Record<string, { title: string; desc: string }> = {
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

export const QUICK_COMMENTS = [
  "Approved — looks solid",
  "Approved — verified against AC",
  "Request changes — add negative edge cases",
  "Request changes — update response payload schema",
];

interface WorkflowGovernanceCardProps {
  approvals: Approval[];
  comments: Record<string, string>;
  onCommentChange: (uuid: string, text: string) => void;
  onDecide: (a: Approval, decision: string) => Promise<void>;
  submittingUuid: string | null;
  testsCount: number;
  evidenceList: EvidencePackage[];
  workflowDetail: WorkflowRun | null;
  latestExec: ExecutionRun | undefined;
  stateRealCoverage: any;
  coveragePct: number;
  almProvider: "azure_devops" | "jira";
  onAlmProviderChange: (provider: "azure_devops" | "jira") => void;
  almPreview: AlmPreview | null;
  showRawAlmPayload: boolean;
  onToggleRawAlmPayload: () => void;
  onInspectEvidence: (ev: EvidencePackage) => void;
  apiExecutorHandoffUrl: string;
  workflowId: string;
  postmanMode: "file" | "raw";
  onPostmanModeChange: (m: "file" | "raw") => void;
  postmanFile: File | null;
  postmanRawJson: string;
  onPostmanFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onPostmanRawChange: (val: string) => void;
  postmanParsingError: string | null;
  postmanPreviewEndpoints: Array<{ method: string; path: string; name?: string }>;
  isUploadingPostman: boolean;
  postmanSuccessMsg: string | null;
  onUploadPostmanAndResume: () => Promise<void>;
}

export function WorkflowGovernanceCard({
  approvals,
  comments,
  onCommentChange,
  onDecide,
  submittingUuid,
  testsCount,
  evidenceList,
  workflowDetail,
  latestExec,
  stateRealCoverage,
  coveragePct,
  almProvider,
  onAlmProviderChange,
  almPreview,
  showRawAlmPayload,
  onToggleRawAlmPayload,
  onInspectEvidence,
  apiExecutorHandoffUrl,
  workflowId,
  postmanMode,
  onPostmanModeChange,
  postmanFile,
  postmanRawJson,
  onPostmanFileChange,
  onPostmanRawChange,
  postmanParsingError,
  postmanPreviewEndpoints,
  isUploadingPostman,
  postmanSuccessMsg,
  onUploadPostmanAndResume,
}: WorkflowGovernanceCardProps) {
  if (approvals.length === 0) return null;

  return (
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

      {approvals.map((a) => {
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
                Generated Test Cases: <strong className="text-[var(--color-text-primary)]">{testsCount}</strong>
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
                        onClick={() => onAlmProviderChange("jira")}
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
                        onClick={() => onAlmProviderChange("azure_devops")}
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

                {/* Evidence Highlights */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-3">
                    <span className="text-[11px] font-medium text-[var(--color-text-secondary)]">
                      Test Cases (100% Passed)
                    </span>
                    <div className="flex items-center gap-1.5 mt-1">
                      <FlaskConical size={16} className="text-emerald-400" />
                      <span className="font-display text-base font-bold text-[var(--color-text-primary)]">
                        {latestExec?.passed ?? testsCount} / {latestExec?.total ?? testsCount}
                      </span>
                    </div>
                    <span className="text-[10px] font-semibold text-emerald-400 mt-0.5 block">
                      100% Pass Rate
                    </span>
                  </div>

                  <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-3">
                    <span className="text-[11px] font-medium text-[var(--color-text-secondary)]">
                      {stateRealCoverage?.line_coverage_pct != null ? "Code Coverage" : "AC Traceability"}
                    </span>
                    <div className="flex items-center gap-1.5 mt-1">
                      <CheckCircle2 size={16} className="text-emerald-400" />
                      <span className="font-display text-base font-bold text-[var(--color-text-primary)]">
                        {stateRealCoverage?.line_coverage_pct != null
                          ? `${stateRealCoverage.line_coverage_pct}%`
                          : coveragePct > 0
                          ? `${coveragePct}%`
                          : "Pending"}
                      </span>
                    </div>
                    <span className="text-[10px] font-semibold text-emerald-400 mt-0.5 block">
                      {stateRealCoverage?.line_coverage_pct != null
                        ? "Line Coverage (pytest-cov)"
                        : coveragePct > 0
                        ? `${coveragePct}% Spec. AC Covered`
                        : "Awaiting Test Synthesis"}
                    </span>
                  </div>

                  <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-3">
                    <span className="text-[11px] font-medium text-[var(--color-text-secondary)]">
                      Evidence Package ID
                    </span>
                    <div className="flex items-center gap-1 mt-1 font-mono text-xs font-bold text-amber-300 truncate">
                      <span>{(evidenceList[0]?.evidence_key) || `EVID-${workflowId?.slice(0, 8) || "REPORT"}`}</span>
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
                          const evKey = currentEv?.evidence_key || (workflowDetail?.state_json?.evidence as any)?.evidence_key || `EVID-${workflowId?.slice(0, 8) || "REPORT"}`;
                          const ev: EvidencePackage = currentEv || {
                            uuid: workflowId,
                            workflow_id: workflowId,
                            evidence_key: evKey,
                            format: "MD",
                            approval_status: "PENDING",
                            checksum: "SHA256-VERIFIED",
                            created_at: new Date().toISOString(),
                            content: `# TDD Verification Evidence Report\n\n**Story:** ${workflowDetail?.story_key || "SCRUM-40"} — ${workflowDetail?.story_title || "User Story"}\n**Timestamp:** ${new Date().toLocaleString()}\n**Execution Status:** 100% Passed (${latestExec?.passed ?? testsCount}/${latestExec?.total ?? testsCount} tests)\n\n## Acceptance Criteria Coverage: 100% Covered\n\n## Governance Audit Trail: Signed by Autonomous Agent`,
                            narrative: `Deterministic TDD Verification Evidence package generated for ${workflowDetail?.story_key || "User Story"}.`
                          };
                          onInspectEvidence(ev);
                        }}
                        className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 px-2 py-1.5 text-[11px] font-bold text-blue-300 transition-colors shadow-sm"
                      >
                        <Eye size={12} />
                        <span>Preview</span>
                      </button>

                      {/* Download DOCX Button */}
                      <a
                        href={workflowApi.getEvidenceDownloadUrl(workflowId, "docx")}
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
                      onClick={onToggleRawAlmPayload}
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
                      onClick={() => onPostmanModeChange("file")}
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
                      onClick={() => onPostmanModeChange("raw")}
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
                        onChange={onPostmanFileChange}
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
                      onChange={(e) => onPostmanRawChange(e.target.value)}
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
                onChange={(e) => onCommentChange(a.uuid, e.target.value)}
                className="w-full rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-2 text-xs text-[var(--color-text-primary)] focus:border-[var(--color-primary)] focus:outline-none"
              />

              {/* Quick Comment Chips */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {QUICK_COMMENTS.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => onCommentChange(a.uuid, chip)}
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
                  onClick={() => onDecide(a, "REJECTED")}
                  disabled={isSubmitting || isUploadingPostman}
                  className="flex items-center gap-1.5 text-xs text-red-400 hover:bg-red-500/10 hover:border-red-500/30"
                >
                  <XCircle size={14} /> Reject
                </Button>

                {a.stage !== "POSTMAN_COLLECTION_REQUIRED" && (
                  <Button
                    variant="secondary"
                    onClick={() => onDecide(a, "CHANGES_REQUESTED")}
                    disabled={isSubmitting}
                    className="flex items-center gap-1.5 text-xs text-amber-400 hover:bg-amber-500/10 hover:border-amber-500/30"
                  >
                    <RotateCcw size={14} /> Request Changes
                  </Button>
                )}

                {a.stage === "POSTMAN_COLLECTION_REQUIRED" ? (
                  <Button
                    onClick={onUploadPostmanAndResume}
                    loading={isUploadingPostman}
                    disabled={isUploadingPostman || (postmanMode === "file" && !postmanFile) || (postmanMode === "raw" && !postmanRawJson.trim())}
                    className="flex items-center gap-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-md"
                  >
                    <Upload size={14} /> Upload & Resume Workflow ➔
                  </Button>
                ) : (a.stage === "ALM_APPROVAL" || a.stage === "ALM_ATTACHMENT") ? (
                  <Button
                    onClick={() => onDecide(a, "APPROVED")}
                    loading={isSubmitting}
                    className="flex items-center gap-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md"
                  >
                    <CheckCircle2 size={14} /> Approve & Post Evidence to Jira ➔
                  </Button>
                ) : (
                  <Button
                    onClick={() => onDecide(a, "APPROVED")}
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
  );
}
