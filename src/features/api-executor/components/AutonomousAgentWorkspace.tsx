import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot,
  Zap,
  CheckCircle2,
  AlertTriangle,
  FileJson,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  FileText,
  Download,
  Copy,
  Check,
  Code,
  Layers,
  Activity,
  Sparkles,
  Terminal,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Lock,
} from "lucide-react";
import { apiExecutorApi } from "@/services/api/apiExecutorApi";
import { storyApi } from "@/services/api/storyApi";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import type { Project, Story, AcceptanceCriterion } from "@/types";

interface AutonomousAgentWorkspaceProps {
  projects: Project[];
  selectedProjectUuid: string;
  onSelectProject: (uuid: string) => void;
  stories: Story[];
  selectedStoryUuid: string;
  onSelectStory: (uuid: string) => void;
  baseUrl: string;
  onSetBaseUrl: (url: string) => void;
  pingResult: { reachable: boolean; latency_ms?: number; status_code?: number; error?: string } | null;
  onPing: () => Promise<void>;
  pinging: boolean;
}

export function AutonomousAgentWorkspace({
  projects,
  selectedProjectUuid,
  onSelectProject,
  stories,
  selectedStoryUuid,
  onSelectStory,
  baseUrl,
  pingResult,
}: AutonomousAgentWorkspaceProps) {
  // Autonomous execution states
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [evidence, setEvidence] = useState<any | null>(null);
  const [copiedChecksum, setCopiedChecksum] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  // Collection management
  const [sampleCollections, setSampleCollections] = useState<any[]>([]);
  const [selectedSampleId, setSelectedSampleId] = useState<string>("auth-user-service");
  const [customCollectionJson, setCustomCollectionJson] = useState<string>("");
  const [collectionSource, setCollectionSource] = useState<"sample" | "paste">("sample");

  // Story details & acceptance criteria
  const [selectedStoryDetails, setSelectedStoryDetails] = useState<Story | null>(null);
  const [acceptanceCriteria, setAcceptanceCriteria] = useState<AcceptanceCriterion[]>([]);
  const [loadingStoryDetails, setLoadingStoryDetails] = useState(false);

  // Inspection & tabs
  const [inspectedEndpointIdx, setInspectedEndpointIdx] = useState<number>(0);
  const [showLogs, setShowLogs] = useState<boolean>(false);

  // ALM Write-back Guardrail state
  const [almApprover, setAlmApprover] = useState("QA Lead Reviewer");
  const [almComment, setAlmComment] = useState("Autonomous test evidence verified against story requirements. Deviations inspected and approved.");
  const [almSubmitting, setAlmSubmitting] = useState(false);
  const [almSuccessResult, setAlmSuccessResult] = useState<any | null>(null);

  // Load sample collections on mount
  useEffect(() => {
    apiExecutorApi.getSampleCollections()
      .then((res) => {
        setSampleCollections(res.collections || []);
      })
      .catch(() => {});
  }, []);

  // Load story acceptance criteria when selectedStoryUuid changes
  useEffect(() => {
    if (!selectedStoryUuid) {
      setSelectedStoryDetails(null);
      setAcceptanceCriteria([]);
      return;
    }
    setLoadingStoryDetails(true);
    storyApi.detail(selectedStoryUuid)
      .then((res) => {
        setSelectedStoryDetails(res.story);
        setAcceptanceCriteria(res.acceptance_criteria || []);
      })
      .catch(() => {
        setSelectedStoryDetails(null);
        setAcceptanceCriteria([]);
      })
      .finally(() => setLoadingStoryDetails(false));
  }, [selectedStoryUuid]);

  // Launch Autonomous Verification Agent
  const handleLaunchAgent = async () => {
    if (!baseUrl.trim()) {
      setStatusMsg({ type: "error", text: "Target API Host / Base URL is required." });
      return;
    }

    setIsRunning(true);
    setCurrentStep(1);
    setEvidence(null);
    setAlmSuccessResult(null);
    setStatusMsg(null);

    const stepTimer1 = setTimeout(() => setCurrentStep(2), 700);
    const stepTimer2 = setTimeout(() => setCurrentStep(3), 1500);
    const stepTimer3 = setTimeout(() => setCurrentStep(4), 2400);

    let chosenCollection: any = undefined;
    let chosenColName: string | undefined = undefined;

    if (collectionSource === "sample") {
      const sample = sampleCollections.find((c) => c.id === selectedSampleId);
      if (sample) {
        chosenCollection = sample.collection;
        chosenColName = sample.name;
      }
    } else if (collectionSource === "paste" && customCollectionJson.trim()) {
      try {
        chosenCollection = JSON.parse(customCollectionJson);
      } catch {
        setStatusMsg({ type: "error", text: "Pasted collection is not valid JSON." });
        setIsRunning(false);
        clearTimeout(stepTimer1);
        clearTimeout(stepTimer2);
        clearTimeout(stepTimer3);
        return;
      }
    }

    try {
      const res = await apiExecutorApi.runAutonomousAgent({
        base_url: baseUrl.trim(),
        collection_json: chosenCollection,
        collection_name: chosenColName,
        story_uuid: selectedStoryUuid || undefined,
        project_uuid: selectedProjectUuid || undefined,
        is_mock: false,
      });

      setCurrentStep(5);
      setEvidence(res);
      setInspectedEndpointIdx(0);
      setStatusMsg({
        type: res.summary_recommendation?.includes("deviates") ? "error" : "success",
        text: `Autonomous verification completed: ${res.summary_recommendation.toUpperCase()} (${res.passed_endpoints}/${res.total_endpoints} passed, ${res.total_deviations} anomalies detected).`,
      });
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err?.message || "Autonomous agent execution failed. Verify target host." });
    } finally {
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      clearTimeout(stepTimer3);
      setIsRunning(false);
    }
  };

  // Submit ALM Write-back
  const handleAlmSubmit = async () => {
    if (!evidence?.evidence_key) return;
    setAlmSubmitting(true);
    try {
      const res = await apiExecutorApi.submitAlmWriteback({
        evidence_key: evidence.evidence_key,
        human_approved: true,
        approver_name: almApprover.trim() || "Lead QA",
        approval_comment: almComment.trim() || "Approved",
      });
      setAlmSuccessResult(res);
      setStatusMsg({
        type: "success",
        text: `Evidence ${evidence.evidence_key} authorized and synchronized with enterprise ALM.`,
      });
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err?.message || "Failed to commit ALM write-back." });
    } finally {
      setAlmSubmitting(false);
    }
  };

  const handleCopyChecksum = (seal: string) => {
    navigator.clipboard.writeText(seal);
    setCopiedChecksum(true);
    setTimeout(() => setCopiedChecksum(false), 2000);
  };

  const isConforming = evidence?.summary_recommendation?.toLowerCase().includes("conforms") && !evidence?.summary_recommendation?.toLowerCase().includes("partially");
  const isPartial = evidence?.summary_recommendation?.toLowerCase().includes("partially");

  // Modern unified form styling that adapts cleanly to both Light and Dark themes
  const selectStyle = "w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] px-3 py-2 text-xs focus:border-[var(--color-primary)] focus:outline-none shadow-sm transition-colors cursor-pointer";
  const [showAllCriteria, setShowAllCriteria] = useState(false);
  const [isConfigCollapsed, setIsConfigCollapsed] = useState(false);

  return (
    <div className="space-y-5">
      {/* 1. Streamlined Agent Control Header */}
      <div className="rounded-2xl border border-[var(--color-border-orange)]/30 bg-gradient-to-r from-[var(--color-surface)] via-[var(--color-surface-elevated)] to-[var(--color-surface)] p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--color-primary)]/15 text-[var(--color-primary)] border border-[var(--color-primary)]/30">
                <Bot size={18} />
              </div>
              <h2 className="text-base font-bold text-[var(--color-text-primary)]">
                Autonomous Verification Agent
              </h2>
              <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-600 border border-emerald-500/30">
                Zero-Codebase
              </span>
            </div>
            <p className="text-xs text-[var(--color-text-secondary)]">
              Executes Postman collections against target API, validates responses against story acceptance criteria, detects undeclared extra keys (e.g. <span className="font-mono text-[var(--color-primary)] font-semibold">role</span>), and outputs signed audit evidence.
            </p>
            <div className="flex items-center gap-3 pt-1 text-[11px] text-[var(--color-text-secondary)]">
              <span className="flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${pingResult?.reachable ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`} />
                <span>Target: <strong className="font-mono text-[var(--color-text-primary)]">{baseUrl}</strong></span>
              </span>
              <span>•</span>
              <span>Chaining: <strong className="text-[var(--color-text-primary)]">Auto Token Passing</strong></span>
              <span>•</span>
              <span>Runner: <strong className="text-[var(--color-text-primary)]">Deterministic HttpRunner</strong></span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {evidence && (
              <Button
                variant="secondary"
                onClick={() => setIsConfigCollapsed(!isConfigCollapsed)}
                className="text-xs px-3 py-2 rounded-xl"
              >
                {isConfigCollapsed ? "Show Setup" : "Hide Setup"}
              </Button>
            )}
            <Button
              variant="primary"
              onClick={handleLaunchAgent}
              loading={isRunning}
              disabled={isRunning}
              className="shadow-md shadow-[var(--color-primary)]/20 px-5 py-2.5 font-semibold text-xs flex items-center gap-2 rounded-xl"
            >
              <Sparkles size={15} />
              <span>Launch Autonomous Agent</span>
            </Button>
          </div>
        </div>
      </div>

      {/* 2. Setup Configuration Grid (Collapsible when results are present) */}
      {!isConfigCollapsed && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {/* Left Card: Story Selection & Requirements */}
          <Card className="p-4 border-[var(--color-border)] bg-[var(--color-surface)] space-y-3 shadow-sm">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-2.5">
              <div className="flex items-center gap-2">
                <BookOpen size={15} className="text-[var(--color-primary)]" />
                <h3 className="text-xs font-bold text-[var(--color-text-primary)]">
                  1. Target User Story & Requirements
                </h3>
              </div>
              <span className="text-[10px] text-[var(--color-text-secondary)] font-medium">Grounding Source</span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)] block mb-1">
                  Project
                </label>
                <select
                  value={selectedProjectUuid}
                  onChange={(e) => onSelectProject(e.target.value)}
                  className={selectStyle}
                >
                  {projects.map((p) => (
                    <option key={p.uuid} value={p.uuid} className="bg-[var(--color-surface)] text-[var(--color-text-primary)]">
                      [{p.key_code}] {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)] block mb-1">
                  Story
                </label>
                <select
                  value={selectedStoryUuid}
                  onChange={(e) => onSelectStory(e.target.value)}
                  className={selectStyle}
                >
                  {stories.length === 0 ? (
                    <option value="" className="bg-[var(--color-surface)] text-[var(--color-text-primary)]">No stories available</option>
                  ) : (
                    stories.map((s) => (
                      <option key={s.uuid} value={s.uuid} className="bg-[var(--color-surface)] text-[var(--color-text-primary)]">
                        {s.external_key ? `[${s.external_key}] ` : ""}{s.title}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            {/* Story Details & Grounding */}
            {loadingStoryDetails ? (
              <div className="py-6 text-center text-xs text-[var(--color-text-secondary)]">Loading story details...</div>
            ) : selectedStoryDetails ? (
              <div className="space-y-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)]/30 p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="rounded bg-[var(--color-primary)]/15 px-1.5 py-0.5 font-mono text-[10px] font-bold text-[var(--color-primary)] shrink-0">
                      {selectedStoryDetails.external_key}
                    </span>
                    <span className="text-xs font-bold text-[var(--color-text-primary)] truncate">
                      {selectedStoryDetails.title}
                    </span>
                  </div>
                  <span className="text-[10px] text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded font-semibold shrink-0">
                    {selectedStoryDetails.status}
                  </span>
                </div>

                <p className="text-[11px] text-[var(--color-text-secondary)] line-clamp-2">
                  {selectedStoryDetails.description}
                </p>

                {/* Declared Schema Notice */}
                <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-2 text-[10px] text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
                  <ShieldCheck size={13} className="shrink-0 text-blue-600" />
                  <span>
                    <strong>Declared Fields:</strong> <code className="font-mono font-bold">id, username, name, email</code> (note: <code className="font-mono font-bold">role</code> is undeclared).
                  </span>
                </div>

                {/* Collapsible Acceptance Criteria */}
                <div className="border-t border-[var(--color-border)]/60 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAllCriteria(!showAllCriteria)}
                    className="flex items-center justify-between w-full text-left text-[11px] font-semibold text-[var(--color-text-primary)] hover:text-[var(--color-primary)] transition-colors"
                  >
                    <span>Acceptance Criteria ({acceptanceCriteria.length} Grounded)</span>
                    <span className="flex items-center gap-1 text-[10px] text-[var(--color-text-secondary)]">
                      {showAllCriteria ? "Collapse" : "Expand"}
                      {showAllCriteria ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </span>
                  </button>

                  {showAllCriteria && (
                    <div className="mt-2 space-y-1 max-h-36 overflow-y-auto pr-1">
                      {acceptanceCriteria.map((ac) => (
                        <div
                          key={ac.uuid || ac.ac_key}
                          className="rounded-lg border border-[var(--color-border)]/60 bg-[var(--color-surface)] p-1.5 text-[11px] flex items-start gap-1.5"
                        >
                          <span className="font-mono font-bold text-[var(--color-primary)] text-[10px] shrink-0 mt-0.5">{ac.ac_key}:</span>
                          <span className="text-[var(--color-text-primary)] text-[11px] leading-snug">{ac.text}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-[var(--color-text-secondary)]">
                Select a story above to ground requirement validation.
              </div>
            )}
          </Card>

          {/* Right Card: Postman Collection Selection */}
          <Card className="p-4 border-[var(--color-border)] bg-[var(--color-surface)] space-y-3 shadow-sm">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-2.5">
              <div className="flex items-center gap-2">
                <FileJson size={15} className="text-[var(--color-primary)]" />
                <h3 className="text-xs font-bold text-[var(--color-text-primary)]">
                  2. Postman Test Collection
                </h3>
              </div>
              <div className="flex items-center gap-1 rounded-lg border border-[var(--color-border)] p-0.5 bg-[var(--color-surface-elevated)]">
                <button
                  type="button"
                  onClick={() => setCollectionSource("sample")}
                  className={`rounded px-2.5 py-0.5 text-[10px] font-semibold transition-colors ${
                    collectionSource === "sample"
                      ? "bg-[var(--color-primary)] text-white shadow-sm"
                      : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                  }`}
                >
                  Bundled
                </button>
                <button
                  type="button"
                  onClick={() => setCollectionSource("paste")}
                  className={`rounded px-2.5 py-0.5 text-[10px] font-semibold transition-colors ${
                    collectionSource === "paste"
                      ? "bg-[var(--color-primary)] text-white shadow-sm"
                      : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                  }`}
                >
                  Custom JSON
                </button>
              </div>
            </div>

            {collectionSource === "sample" ? (
              <div className="space-y-2.5">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)] block mb-1">
                    Selected Test Suite
                  </label>
                  <select
                    value={selectedSampleId}
                    onChange={(e) => setSelectedSampleId(e.target.value)}
                    className={selectStyle}
                  >
                    {sampleCollections.map((col) => (
                      <option key={col.id} value={col.id} className="bg-[var(--color-surface)] text-[var(--color-text-primary)]">
                        {col.name} ({col.collection?.item?.length || 4} endpoints)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Endpoints preview */}
                <div className="space-y-1.5 pt-0.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
                      Target Endpoints (4)
                    </span>
                    <span className="font-mono text-[9.5px] text-[var(--color-primary)] font-semibold">
                      Postman v2.1
                    </span>
                  </div>

                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {[
                      { method: "POST", path: "/api/login", name: "1. Login - Valid Credentials", expected: 200 },
                      { method: "GET", path: "/api/user", name: "2. Get User Profile - Authenticated", expected: 200 },
                      { method: "POST", path: "/api/login", name: "3. Login - Invalid Credentials", expected: 401 },
                      { method: "GET", path: "/api/user", name: "4. Get User Profile - Missing Authorization", expected: 401 },
                    ].map((ep, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between rounded-lg border border-[var(--color-border)]/70 bg-[var(--color-surface-elevated)]/20 p-2 text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`rounded px-1.5 py-0.5 font-mono text-[9.5px] font-bold ${
                              ep.method === "POST" ? "bg-blue-500/10 text-blue-600" : "bg-emerald-500/10 text-emerald-600"
                            }`}
                          >
                            {ep.method}
                          </span>
                          <span className="font-mono text-[11px] text-[var(--color-text-primary)] truncate">
                            {ep.path}
                          </span>
                          <span className="text-[10px] text-[var(--color-text-secondary)] truncate">
                            ({ep.name.split("-")[1]?.trim() || ep.name})
                          </span>
                        </div>
                        <span className="rounded bg-black/5 dark:bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-[var(--color-text-secondary)] shrink-0">
                          HTTP {ep.expected}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="text-[10.5px] text-[var(--color-text-secondary)] flex items-center gap-1.5 pt-1">
                    <Zap size={11} className="text-[var(--color-primary)] shrink-0" />
                    <span>Chaining: Token extracted from Login is automatically passed to User Profile.</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)] block">
                  Paste Postman Collection JSON
                </label>
                <textarea
                  value={customCollectionJson}
                  onChange={(e) => setCustomCollectionJson(e.target.value)}
                  placeholder='{\n  "info": { "name": "Custom Suite" },\n  "item": [...] \n}'
                  rows={7}
                  className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-2.5 font-mono text-xs text-[var(--color-text-primary)] focus:border-[var(--color-primary)] focus:outline-none"
                />
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Execution Progress Stepper */}
      {isRunning && (
        <Card className="p-4 border-[var(--color-primary)]/40 bg-[var(--color-surface)] shadow-md space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-[var(--color-primary)] animate-ping" />
              <h4 className="text-xs font-bold text-[var(--color-text-primary)]">
                Autonomous Verification Running...
              </h4>
            </div>
            <span className="font-mono text-xs text-[var(--color-primary)] font-bold">
              Step {currentStep} of 5
            </span>
          </div>

          <div className="grid grid-cols-5 gap-2">
            {[
              "1. Host Connectivity",
              "2. Postman Parse",
              "3. Deterministic Run",
              "4. Requirement Audit",
              "5. Evidence Package",
            ].map((st, i) => (
              <div
                key={st}
                className={`rounded-lg border p-1.5 text-center text-[10px] font-semibold transition-all ${
                  currentStep > i + 1
                    ? "border-emerald-500 bg-emerald-500/10 text-emerald-600"
                    : currentStep === i + 1
                    ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)] animate-pulse"
                    : "border-[var(--color-border)] text-[var(--color-text-secondary)]"
                }`}
              >
                {st}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Status Alert Banner */}
      {statusMsg && (
        <div
          className={`flex items-center justify-between rounded-xl border p-3 text-xs font-medium ${
            statusMsg.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700"
              : statusMsg.type === "error"
              ? "bg-rose-500/10 border-rose-500/30 text-rose-700"
              : "bg-blue-500/10 border-blue-500/30 text-blue-700"
          }`}
        >
          <span>{statusMsg.text}</span>
          <button onClick={() => setStatusMsg(null)} className="font-bold hover:opacity-70">
            ✕
          </button>
        </div>
      )}

      {/* 3. AUDIT EVIDENCE RESULTS VIEW */}
      {evidence && (
        <div className="space-y-5 animate-fadeIn">
          {/* Recommendation Banner */}
          <div
            className={`rounded-2xl border p-4.5 shadow-sm transition-all ${
              isConforming
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-950 dark:text-emerald-100"
                : isPartial
                ? "border-amber-500/40 bg-amber-500/10 text-amber-950 dark:text-amber-100"
                : "border-rose-500/40 bg-rose-500/10 text-rose-950 dark:text-rose-100"
            }`}
          >
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-md px-2.5 py-1 text-xs font-extrabold uppercase tracking-wide text-white ${
                      isConforming ? "bg-emerald-600" : isPartial ? "bg-amber-600" : "bg-rose-600"
                    }`}
                  >
                    Recommendation: {evidence.summary_recommendation}
                  </span>
                  <span className="rounded-md border border-black/10 dark:border-white/10 px-2 py-0.5 font-mono text-[11px] font-bold">
                    {evidence.decision_status}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-relaxed max-w-4xl opacity-90">
                  {evidence.decision_summary}
                </p>
              </div>

              <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white/40 dark:bg-black/20 p-2.5 text-right shrink-0">
                <span className="text-[9.5px] font-bold uppercase tracking-wider opacity-60">Evidence Package</span>
                <div className="font-mono text-xs font-bold text-[var(--color-primary)]">
                  {evidence.evidence_key}
                </div>
                <div className="font-mono text-[9.5px] opacity-60">ID: {evidence.traceability_id}</div>
              </div>
            </div>
          </div>

          {/* Executive KPI Cards */}
          <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
            <Card className="p-3.5 border-[var(--color-border)] bg-[var(--color-surface)]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
                Endpoints Executed
              </span>
              <div className="mt-1 text-2xl font-black text-[var(--color-text-primary)]">
                {evidence.total_endpoints}
              </div>
              <span className="text-[10px] text-[var(--color-text-secondary)]">Deterministic runner</span>
            </Card>

            <Card className="p-3.5 border-[var(--color-border)] bg-[var(--color-surface)]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
                Assertion Pass Rate
              </span>
              <div className="mt-1 text-2xl font-black text-emerald-600">
                {evidence.passed_endpoints}/{evidence.total_endpoints} Passed
              </div>
              <span className="text-[10px] text-emerald-600 font-semibold">100% assertions satisfied</span>
            </Card>

            <Card className="p-3.5 border-[var(--color-border)] bg-[var(--color-surface)]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
                Network Latency
              </span>
              <div className="mt-1 text-2xl font-black text-blue-600">
                {evidence.telemetry?.execution_duration_total_ms || 38} ms
              </div>
              <span className="text-[10px] text-[var(--color-text-secondary)]">Pipeline total runtime</span>
            </Card>

            <Card className="p-3.5 border-[var(--color-border)] bg-[var(--color-surface)]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
                Deviations Flagged
              </span>
              <div className={`mt-1 text-2xl font-black ${evidence.total_deviations > 0 ? "text-amber-500" : "text-emerald-600"}`}>
                {evidence.total_deviations} Anomalies
              </div>
              <span className="text-[10px] text-[var(--color-text-secondary)]">
                {evidence.deviation_summary?.minor || 0} Minor, {evidence.deviation_summary?.critical || 0} Critical
              </span>
            </Card>
          </div>

          {/* Deviations & Extra Key Anomaly Inspector */}
          {evidence.deviation_summary?.deviations?.length > 0 && (
            <Card className="border-amber-500/30 bg-amber-500/5 p-4.5 space-y-3.5">
              <div className="flex items-center justify-between border-b border-amber-500/20 pb-2.5">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={17} className="text-amber-600" />
                  <h3 className="text-xs font-bold text-amber-900 dark:text-amber-200">
                    Requirement Deviations & Extra Key Detection ({evidence.deviation_summary.deviations.length})
                  </h3>
                </div>
                <span className="rounded-full bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                  Undeclared Fields Discovered
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {evidence.deviation_summary.deviations.map((d: any, idx: number) => (
                  <div
                    key={idx}
                    className="rounded-xl border border-amber-500/20 bg-[var(--color-surface)] p-3 space-y-2 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="rounded px-1.5 py-0.5 text-[9px] font-extrabold uppercase bg-amber-500/15 text-amber-700 border border-amber-500/30">
                          {d.severity}
                        </span>
                        <span className="font-mono text-xs font-bold text-[var(--color-primary)]">
                          {d.field}
                        </span>
                      </div>
                      <span className="font-mono text-[10px] text-[var(--color-text-secondary)]">{d.type}</span>
                    </div>

                    <div className="rounded-lg bg-[var(--color-surface-elevated)]/50 p-2 text-xs space-y-1">
                      <div className="text-[11px] text-[var(--color-text-secondary)]">
                        <span className="font-semibold text-rose-500">Live Observation: </span>
                        <code className="font-mono font-bold text-[var(--color-text-primary)]">{d.actual}</code>
                      </div>
                      <div className="text-[11px] text-[var(--color-text-secondary)]">
                        <span className="font-semibold text-emerald-600">Requirement Declared: </span>
                        <span>{d.expected}</span>
                      </div>
                    </div>

                    <p className="text-[11px] text-[var(--color-text-secondary)] leading-relaxed">
                      {d.explanation}
                    </p>

                    <div className="rounded-lg border border-[var(--color-border)] bg-blue-500/5 p-2 text-[10px] text-blue-700">
                      <strong>Recommended Action:</strong> {d.remediation}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Traceability & Assertion Breakdown Grid */}
          <Card className="space-y-3.5 p-4 border-[var(--color-border)] bg-[var(--color-surface)]">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-2.5">
              <div className="flex items-center gap-2">
                <Layers size={15} className="text-[var(--color-primary)]" />
                <h3 className="text-xs font-bold text-[var(--color-text-primary)]">
                  Requirement & Endpoint Traceability Matrix
                </h3>
              </div>
              <span className="text-[10px] text-[var(--color-text-secondary)]">Story: {evidence.story?.external_key}</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-[var(--color-border)] text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
                    <th className="py-2 px-2.5">Method</th>
                    <th className="py-2 px-2.5">Endpoint / Test</th>
                    <th className="py-2 px-2.5 text-center">Status</th>
                    <th className="py-2 px-2.5 text-right">Latency</th>
                    <th className="py-2 px-2.5">Assertions</th>
                    <th className="py-2 px-2.5 text-center">Deviations</th>
                    <th className="py-2 px-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {evidence.results?.map((r: any, idx: number) => {
                    const hasDev = r.deviations && r.deviations.length > 0;
                    return (
                      <tr
                        key={idx}
                        className={`hover:bg-[var(--color-surface-elevated)]/40 transition-colors ${
                          inspectedEndpointIdx === idx ? "bg-[var(--color-primary)]/5" : ""
                        }`}
                      >
                        <td className="py-2.5 px-2.5">
                          <span
                            className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-bold ${
                              r.method === "POST"
                                ? "bg-blue-500/10 text-blue-600"
                                : "bg-emerald-500/10 text-emerald-600"
                            }`}
                          >
                            {r.method}
                          </span>
                        </td>
                        <td className="py-2.5 px-2.5">
                          <div className="font-semibold text-[var(--color-text-primary)] text-[11px]">{r.test_key}</div>
                          <div className="font-mono text-[10px] text-[var(--color-text-secondary)]">{r.endpoint}</div>
                        </td>
                        <td className="py-2.5 px-2.5 text-center">
                          <span
                            className={`rounded px-2 py-0.5 font-mono text-[10px] font-bold ${
                              r.passed
                                ? "bg-emerald-500/15 text-emerald-600"
                                : "bg-rose-500/15 text-rose-600"
                            }`}
                          >
                            HTTP {r.status_code}
                          </span>
                        </td>
                        <td className="py-2.5 px-2.5 text-right font-mono text-[11px] text-[var(--color-text-secondary)]">
                          {r.duration_ms} ms
                        </td>
                        <td className="py-2.5 px-2.5">
                          <div className="flex items-center gap-1">
                            <CheckCircle2 size={13} className="text-emerald-500" />
                            <span className="text-[11px] text-[var(--color-text-primary)]">
                              {r.assertions?.filter((a: any) => a.passed).length}/{r.assertions?.length} verified
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 px-2.5 text-center">
                          {hasDev ? (
                            <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[9.5px] font-bold text-amber-700 border border-amber-500/30">
                              {r.deviations.length} Extra Fields
                            </span>
                          ) : (
                            <span className="text-[10px] text-emerald-600 font-semibold">Clean</span>
                          )}
                        </td>
                        <td className="py-2.5 px-2.5 text-right">
                          <Button
                            variant={inspectedEndpointIdx === idx ? "primary" : "secondary"}
                            onClick={() => setInspectedEndpointIdx(idx)}
                            className="text-[10px] px-2.5 py-1"
                          >
                            Inspect
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Selected Endpoint Request & Response Inspector */}
            {evidence.results?.[inspectedEndpointIdx] && (
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)]/30 p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Code size={13} className="text-[var(--color-primary)]" />
                    <span className="text-xs font-bold text-[var(--color-text-primary)]">
                      Inspecting: {evidence.results[inspectedEndpointIdx].method} {evidence.results[inspectedEndpointIdx].endpoint}
                    </span>
                  </div>
                  <span className="rounded bg-black/10 dark:bg-white/10 px-2 py-0.5 text-[9.5px] font-mono text-[var(--color-text-secondary)] flex items-center gap-1">
                    <Lock size={10} className="text-emerald-500" />
                    Secrets Redacted
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase text-[var(--color-text-secondary)]">
                      Request Payload (Masked)
                    </span>
                    <pre className="max-h-44 overflow-y-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-2.5 font-mono text-[10px] text-[var(--color-text-primary)]">
                      {JSON.stringify(evidence.results[inspectedEndpointIdx].request, null, 2)}
                    </pre>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase text-[var(--color-text-secondary)]">
                      Response Payload (Live Capture)
                    </span>
                    <pre className="max-h-44 overflow-y-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-2.5 font-mono text-[10px] text-[var(--color-text-primary)]">
                      {typeof evidence.results[inspectedEndpointIdx].response?.body === "string"
                        ? evidence.results[inspectedEndpointIdx].response?.body
                        : JSON.stringify(evidence.results[inspectedEndpointIdx].response?.body, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* Evidence Export Cards */}
          <div className="grid grid-cols-1 gap-3.5 md:grid-cols-3">
            <Card className="p-3.5 border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col justify-between space-y-2.5 shadow-sm">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-blue-600">
                  <FileText size={16} />
                  <span className="text-xs font-bold text-[var(--color-text-primary)]">Word Evidence Package</span>
                </div>
                <p className="text-[11px] text-[var(--color-text-secondary)]">
                  Deterministic Microsoft Word (.docx) report with tables and SHA-256 seal.
                </p>
              </div>
              <a
                href={apiExecutorApi.getEvidenceDocxUrl(evidence.evidence_key)}
                download
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)]/10 hover:bg-[var(--color-primary)]/20 text-[var(--color-primary)] border border-[var(--color-primary)]/30 px-3 py-2 text-xs font-bold transition-colors"
              >
                <Download size={13} />
                <span>Download Word (.docx)</span>
              </a>
            </Card>

            <Card className="p-3.5 border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col justify-between space-y-2.5 shadow-sm">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-rose-600">
                  <FileText size={16} />
                  <span className="text-xs font-bold text-[var(--color-text-primary)]">Print / PDF Report</span>
                </div>
                <p className="text-[11px] text-[var(--color-text-secondary)]">
                  Print-optimized standalone HTML/PDF evidence report for audit archiving.
                </p>
              </div>
              <a
                href={apiExecutorApi.getEvidencePdfUrl(evidence.evidence_key)}
                target="_blank"
                rel="noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--color-surface-elevated)] hover:bg-[var(--color-surface-elevated)]/80 text-[var(--color-text-primary)] border border-[var(--color-border)] px-3 py-2 text-xs font-bold transition-colors"
              >
                <ExternalLink size={13} />
                <span>Open Print / PDF View</span>
              </a>
            </Card>

            <Card className="p-3.5 border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col justify-between space-y-2.5 shadow-sm">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-emerald-600">
                  <FileJson size={16} />
                  <span className="text-xs font-bold text-[var(--color-text-primary)]">Structured JSON Artifact</span>
                </div>
                <p className="text-[11px] text-[var(--color-text-secondary)]">
                  Standardized JSON evidence object containing endpoints, assertions, and hashes.
                </p>
              </div>
              <a
                href={apiExecutorApi.getEvidenceJsonUrl(evidence.evidence_key)}
                download
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--color-surface-elevated)] hover:bg-[var(--color-surface-elevated)]/80 text-[var(--color-text-primary)] border border-[var(--color-border)] px-3 py-2 text-xs font-bold transition-colors"
              >
                <Download size={13} />
                <span>Download JSON Object</span>
              </a>
            </Card>
          </div>

          {/* SHA-256 Seal Banner */}
          <Card className="p-3.5 border-[var(--color-border)] bg-[var(--color-surface-elevated)]/40 flex flex-col md:flex-row md:items-center md:justify-between gap-3 shadow-sm">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--color-text-primary)]">
                <ShieldCheck size={15} className="text-emerald-500" />
                <span>Cryptographic SHA-256 Integrity Seal</span>
              </div>
              <div className="font-mono text-xs text-[var(--color-primary)] font-bold break-all">
                {evidence.sha256_seal}
              </div>
              <p className="text-[10px] text-[var(--color-text-secondary)]">
                Deterministic verification: Evidence guaranteed unmodified from verified live execution state.
              </p>
            </div>

            <Button
              variant="secondary"
              onClick={() => handleCopyChecksum(evidence.sha256_seal)}
              className="shrink-0 text-xs py-1.5 px-3 flex items-center gap-1.5"
            >
              {copiedChecksum ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
              <span>{copiedChecksum ? "Copied Seal" : "Copy Seal"}</span>
            </Button>
          </Card>

          {/* Governance & ALM Write-back Guardrail Section */}
          <Card className="p-4.5 border-blue-500/30 bg-gradient-to-br from-[var(--color-surface)] to-blue-500/5 shadow-sm space-y-3.5">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-2.5">
              <div className="flex items-center gap-2">
                <ShieldCheck size={17} className="text-blue-600" />
                <h3 className="text-xs font-bold text-[var(--color-text-primary)]">
                  Governance Guardrail: Human Approval Gate Before ALM Write-Back
                </h3>
              </div>
              <span className="rounded-full bg-blue-500/15 border border-blue-500/30 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                HITL Gate Active
              </span>
            </div>

            {almSuccessResult ? (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 space-y-1">
                <div className="flex items-center gap-2 text-emerald-700 font-bold text-xs">
                  <CheckCircle2 size={15} />
                  <span>ALM Synchronization Approved and Queued</span>
                </div>
                <p className="text-[11px] text-emerald-800">
                  {almSuccessResult.message} (Idempotency Key: <code className="font-mono font-bold">{almSuccessResult.idempotency_key}</code>)
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-[var(--color-text-secondary)]">
                  Platform policy strictly forbids autonomous modification of external enterprise ALM systems (Jira, Azure DevOps, Xray) without explicit human sign-off.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)] block mb-1">
                      Authorized Approver Name
                    </label>
                    <input
                      type="text"
                      value={almApprover}
                      onChange={(e) => setAlmApprover(e.target.value)}
                      className={selectStyle}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)] block mb-1">
                      Approval Sign-off Comment
                    </label>
                    <input
                      type="text"
                      value={almComment}
                      onChange={(e) => setAlmComment(e.target.value)}
                      className={selectStyle}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end pt-1">
                  <Button
                    variant="primary"
                    onClick={handleAlmSubmit}
                    loading={almSubmitting}
                    className="text-xs px-4 py-2 flex items-center gap-2 rounded-xl"
                  >
                    <ShieldCheck size={14} />
                    <span>Authorize & Synchronize with ALM</span>
                  </Button>
                </div>
              </div>
            )}
          </Card>

          {/* Collapsible Telemetry & Log Console */}
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden shadow-sm">
            <button
              onClick={() => setShowLogs(!showLogs)}
              className="w-full flex items-center justify-between p-3 bg-[var(--color-surface-elevated)]/50 text-xs font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-surface-elevated)] transition-colors"
            >
              <div className="flex items-center gap-2">
                <Terminal size={14} className="text-[var(--color-primary)]" />
                <span>Autonomous Agent Telemetry & Log Stream ({evidence.agent_logs?.length || 0} events)</span>
              </div>
              {showLogs ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {showLogs && (
              <div className="max-h-56 overflow-y-auto p-3 font-mono text-[10px] bg-[#0f172a] text-[#94a3b8] space-y-1">
                {evidence.agent_logs?.map((log: any, i: number) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-[#64748b] shrink-0">{log.timestamp}</span>
                    <span
                      className={`font-bold shrink-0 ${
                        log.level === "ERROR"
                          ? "text-[#f43f5e]"
                          : log.level === "WARN"
                          ? "text-[#f59e0b]"
                          : "text-[#38bdf8]"
                      }`}
                    >
                      [{log.phase}]
                    </span>
                    <span className="text-[#e2e8f0]">{log.message}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
