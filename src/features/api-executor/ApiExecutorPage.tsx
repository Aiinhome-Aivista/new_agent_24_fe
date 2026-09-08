import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  XCircle,
  ExternalLink,
  Plus,
  Trash2,
  Send,
  RefreshCw,
  History,
  Code,
  AlertCircle,
  Terminal,
  Copy,
  Check,
  Activity,
  Zap,
  Bot,
  Sparkles,
  Clock,
  Key,
} from "lucide-react";
import { AutonomousAgentWorkspace } from "./components/AutonomousAgentWorkspace";
import { apiExecutorApi } from "@/services/api/apiExecutorApi";
import { projectApi } from "@/services/api/projectApi";
import { storyApi } from "@/services/api/storyApi";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Loading } from "@/components/ui/Loading";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { ExecutionRun, ExecutionResultItem, Project, Story } from "@/types";

const METHOD_COLORS: Record<string, string> = {
  GET: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  POST: "bg-blue-500/10 text-blue-600 border-blue-500/30",
  PUT: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  DELETE: "bg-rose-500/10 text-rose-600 border-rose-500/30",
  PATCH: "bg-purple-500/10 text-purple-600 border-purple-500/30",
  OPTIONS: "bg-gray-500/10 text-gray-400 border-gray-500/30",
};

interface HeaderRow {
  key: string;
  value: string;
  enabled: boolean;
}

export function ApiExecutorPage() {
  const [searchParams] = useSearchParams();
  const projectParam = searchParams.get("project");

  // Navigation tabs: "autonomous" (Autonomous Verification Agent) | "manual" (Interactive Console) | "history" (Run History)
  const [activeTab, setActiveTab] = useState<"autonomous" | "manual" | "history">("autonomous");
  const [selectedHistoryRun, setSelectedHistoryRun] = useState<ExecutionRun | null>(null);

  // Global Connection Configuration
  const [baseUrl, setBaseUrl] = useState("http://localhost:5001");

  // Target Ping State
  const [pinging, setPinging] = useState(false);
  const [pingResult, setPingResult] = useState<{ reachable: boolean; latency_ms?: number; status_code?: number; error?: string } | null>(null);

  // Projects & Stories for Autonomous Agent
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectUuid, setSelectedProjectUuid] = useState<string>(projectParam || "");
  const [stories, setStories] = useState<Story[]>([]);
  const [selectedStoryUuid, setSelectedStoryUuid] = useState<string>("");
  const [loadingStories, setLoadingStories] = useState(false);

  // Manual Console State
  const [manualMethod, setManualMethod] = useState("POST");
  const [manualUrl, setManualUrl] = useState("http://localhost:5001/api/login");
  const [manualReqTab, setManualReqTab] = useState<"body" | "headers" | "auth" | "assertions">("body");
  const [manualBody, setManualBody] = useState('{\n  "username": "manas",\n  "password": "password123"\n}');
  const [manualHeaders, setManualHeaders] = useState<HeaderRow[]>([
    { key: "Content-Type", value: "application/json", enabled: true },
  ]);
  const [manualAuthType, setManualAuthType] = useState<"none" | "bearer">("none");
  const [manualBearerToken, setManualBearerToken] = useState("");
  const [manualExpectedStatus, setManualExpectedStatus] = useState("200");
  const [manualExpectedContains, setManualExpectedContains] = useState("");
  const [manualSending, setManualSending] = useState(false);
  const [manualResponse, setManualResponse] = useState<any | null>(null);
  const [manualRespTab, setManualRespTab] = useState<"body" | "headers" | "assertions">("body");
  const [detectedToken, setDetectedToken] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Execution History & Inspection State
  const [runHistory, setRunHistory] = useState<ExecutionRun[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [inspectedResult, setInspectedResult] = useState<ExecutionResultItem | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  // Load Projects on mount & sync projectParam
  useEffect(() => {
    if (projectParam) {
      setSelectedProjectUuid(projectParam);
    }
    projectApi
      .list()
      .then((res) => {
        setProjects(res.projects || []);
        if (!selectedProjectUuid && !projectParam && res.projects?.length > 0) {
          setSelectedProjectUuid(res.projects[0].uuid);
        }
      })
      .catch(() => {});
  }, [projectParam]);

  // Load Stories when project changes
  useEffect(() => {
    if (!selectedProjectUuid) {
      setStories([]);
      return;
    }
    setLoadingStories(true);
    storyApi
      .list(selectedProjectUuid)
      .then((res) => {
        setStories(res.stories || []);
        if (res.stories?.length > 0) {
          setSelectedStoryUuid(res.stories[0].uuid);
        } else {
          setSelectedStoryUuid("");
        }
      })
      .catch(() => setStories([]))
      .finally(() => setLoadingStories(false));
  }, [selectedProjectUuid]);

  // Load History when History tab is selected
  useEffect(() => {
    if (activeTab === "history") {
      loadExecutionHistory();
    }
  }, [activeTab, selectedProjectUuid]);

  const loadExecutionHistory = () => {
    setLoadingHistory(true);
    apiExecutorApi
      .listRuns({ project_uuid: selectedProjectUuid || undefined, limit: 50 })
      .then((res) => setRunHistory(res.runs || []))
      .catch(() => {})
      .finally(() => setLoadingHistory(false));
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Ping Target Host
  const handlePing = async () => {
    const target = baseUrl.trim();
    if (!target) return;
    setPinging(true);
    setPingResult(null);
    try {
      const res = await apiExecutorApi.pingTarget(target);
      setPingResult(res);
      if (res.reachable) {
        setStatusMessage({ type: "success", text: `Target API is ONLINE (${res.latency_ms}ms, HTTP ${res.status_code})` });
      } else {
        setStatusMessage({ type: "error", text: `Target API is unreachable: ${res.error || "Connection refused"}` });
      }
    } catch (e: any) {
      setPingResult({ reachable: false, error: e?.message || "Failed to reach host" });
    } finally {
      setPinging(false);
    }
  };

  // Execute Single Request (Manual Console)
  const handleSendManualRequest = async () => {
    let cleanUrl = manualUrl.trim();
    // Fix accidental spacing or malformed protocol typos (e.g. "http: /" or "http:/")
    cleanUrl = cleanUrl.replace(/^https?:\s*\/\s*/i, (m) => m.toLowerCase().startsWith("https") ? "https://" : "http://");

    if (!cleanUrl) {
      setStatusMessage({ type: "error", text: "Endpoint URL or path is required" });
      return;
    }

    setManualSending(true);
    setStatusMessage(null);
    setManualResponse(null);

    // Build headers dict
    const headersMap: Record<string, string> = {};
    manualHeaders.forEach((h) => {
      if (h.enabled && h.key.trim()) {
        headersMap[h.key.trim()] = h.value;
      }
    });

    // Add Bearer auth if configured
    if (manualAuthType === "bearer" && manualBearerToken.trim()) {
      headersMap["Authorization"] = `Bearer ${manualBearerToken.trim()}`;
    }

    // Prepare body
    let parsedBody: any = manualBody.trim();
    if (["POST", "PUT", "PATCH"].includes(manualMethod.toUpperCase()) && manualBody.trim()) {
      try {
        parsedBody = JSON.parse(manualBody);
      } catch {
        parsedBody = manualBody.trim();
      }
    } else if (["GET", "DELETE", "HEAD"].includes(manualMethod.toUpperCase())) {
      parsedBody = undefined;
    }

    try {
      const res = await apiExecutorApi.executeSingle({
        base_url: baseUrl.trim(),
        endpoint: {
          method: manualMethod,
          path: cleanUrl,
          headers: headersMap,
          body: parsedBody,
          expected_status_code: parseInt(manualExpectedStatus, 10) || 200,
          expected_body_contains: manualExpectedContains.trim() || undefined,
          assertions: [`Status code is ${manualExpectedStatus}`],
        },
      });

      setManualResponse(res.result);

      // Check for token in extracted tokens
      if (res.extracted_tokens) {
        const tokenFound = res.extracted_tokens.access_token || res.extracted_tokens.token || res.extracted_tokens.jwt;
        if (tokenFound) {
          setDetectedToken(tokenFound);
        }
      }

      if (res.result.passed) {
        setStatusMessage({
          type: "success",
          text: `HTTP ${res.result.status_code} OK — Execution passed in ${res.result.duration_ms}ms`,
        });
      } else {
        setStatusMessage({
          type: "error",
          text: `HTTP ${res.result.status_code} — Assertion or request failed (${res.result.duration_ms}ms)`,
        });
      }
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err?.message || "Failed to execute request" });
    } finally {
      setManualSending(false);
    }
  };

  const calculatePassRate = (run: ExecutionRun) => {
    if (!run || run.total === 0) return 0;
    return Math.round((run.passed / run.total) * 100);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between border-b border-[var(--color-border)] pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-display text-2xl font-bold text-[var(--color-text-primary)]">
              API Executor
            </h1>
            <span className="rounded-full bg-[var(--color-primary)]/10 px-2.5 py-0.5 text-xs font-semibold text-[var(--color-primary)] border border-[var(--color-primary)]/20">
              Zero-Codebase Runner
            </span>
          </div>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            Verify APIs against user stories with autonomous AI agents or execute manual requests directly.
          </p>
        </div>

        {/* Streamlined View Switcher: Autonomous Agent | Interactive Console | Run History */}
        <div className="flex items-center gap-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-1 shadow-sm">
          <button
            onClick={() => setActiveTab("autonomous")}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-medium transition-colors ${
              activeTab === "autonomous"
                ? "bg-[var(--color-primary)] text-white shadow-sm font-semibold"
                : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            }`}
          >
            <Bot size={14} />
            <span>Autonomous Agent</span>
            <span className="rounded-full bg-white/20 px-1.5 py-0.2 text-[9px] font-extrabold uppercase tracking-wider">
              AI
            </span>
          </button>
          <button
            onClick={() => setActiveTab("manual")}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-medium transition-colors ${
              activeTab === "manual"
                ? "bg-[var(--color-primary)] text-white shadow-sm font-semibold"
                : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            }`}
          >
            <Terminal size={14} />
            <span>Interactive Console</span>
          </button>
          <button
            onClick={() => {
              setActiveTab("history");
              loadExecutionHistory();
            }}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-medium transition-colors ${
              activeTab === "history"
                ? "bg-[var(--color-primary)] text-white shadow-sm font-semibold"
                : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            }`}
          >
            <History size={14} />
            <span>Run History</span>
          </button>
        </div>
      </div>

      {/* Target Base URL Host Configuration */}
      <Card className="border-[var(--color-border-orange)]/30 bg-gradient-to-br from-[var(--color-surface)] to-[var(--color-surface-elevated)]/40 p-4 shadow-sm">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-[var(--color-text-primary)] flex items-center gap-1.5">
              <Activity size={14} className="text-[var(--color-primary)]" />
              <span>Target API Host / Base URL</span>
              <span className="text-[var(--color-primary)]">*</span>
            </label>
            <div className="flex items-center gap-2">
              {pingResult && (
                <span
                  className={`flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold ${
                    pingResult.reachable
                      ? "bg-emerald-500/15 text-emerald-600 border border-emerald-500/30"
                      : "bg-rose-500/15 text-rose-600 border border-rose-500/30"
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${pingResult.reachable ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`} />
                  {pingResult.reachable ? `ONLINE (${pingResult.latency_ms}ms · HTTP ${pingResult.status_code})` : "OFFLINE"}
                </span>
              )}
              <span className="text-[11px] text-[var(--color-text-secondary)]">
                Direct HTTP connection
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1 flex items-center">
              <span className="absolute left-3 font-mono text-xs text-[var(--color-text-secondary)] font-bold">
                URL:
              </span>
              <input
                type="text"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="http://localhost:5001 or https://api.example.com"
                className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] py-2.5 pl-14 pr-4 font-mono text-xs text-[var(--color-text-primary)] focus:border-[var(--color-primary)] focus:outline-none"
              />
            </div>

            <Button
              variant="secondary"
              onClick={handlePing}
              loading={pinging}
              className="text-xs px-3.5 py-2.5 shrink-0"
              title="Check if host is reachable"
            >
              <Zap size={13} className="text-[var(--color-primary)]" />
              <span>Test Connection</span>
            </Button>
          </div>

          {/* Presets */}
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            <span className="text-[10px] text-[var(--color-text-secondary)] font-medium">Quick Presets:</span>
            {[
              "http://localhost:5001",
              "http://localhost:8080",
              "http://127.0.0.1:5000",
              "http://localhost:3000",
              "https://httpbin.org",
            ].map((preset) => (
              <button
                key={preset}
                onClick={() => {
                  setBaseUrl(preset);
                  if (manualUrl.startsWith("http://localhost:") || manualUrl.startsWith("http://127.0.0.1:")) {
                    setManualUrl(`${preset}/api/login`);
                  }
                }}
                className={`rounded-md border px-2 py-0.5 font-mono text-[10px] transition-colors ${
                  baseUrl === preset
                    ? "border-[var(--color-primary)] text-[var(--color-primary)] bg-[var(--color-primary)]/10 font-bold"
                    : "border-[var(--color-border)] bg-[var(--color-surface-elevated)]/60 text-[var(--color-text-secondary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                }`}
              >
                {preset}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Global Status Banner */}
      <AnimatePresence>
        {statusMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`flex items-center justify-between rounded-xl border p-3.5 text-xs font-medium shadow-sm ${
              statusMessage.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700"
                : statusMessage.type === "error"
                ? "bg-rose-500/10 border-rose-500/30 text-rose-700"
                : "bg-blue-500/10 border-blue-500/30 text-blue-700"
            }`}
          >
            <div className="flex items-center gap-2">
              {statusMessage.type === "success" ? (
                <CheckCircle2 size={16} />
              ) : statusMessage.type === "error" ? (
                <XCircle size={16} />
              ) : (
                <AlertCircle size={16} />
              )}
              <span>{statusMessage.text}</span>
            </div>
            <button
              onClick={() => setStatusMessage(null)}
              className="text-xs hover:opacity-70 font-semibold"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TAB 0: AUTONOMOUS AGENT WORKSPACE */}
      {activeTab === "autonomous" && (
        <AutonomousAgentWorkspace
          projects={projects}
          selectedProjectUuid={selectedProjectUuid}
          onSelectProject={setSelectedProjectUuid}
          stories={stories}
          selectedStoryUuid={selectedStoryUuid}
          onSelectStory={setSelectedStoryUuid}
          baseUrl={baseUrl}
          onSetBaseUrl={setBaseUrl}
          pingResult={pingResult}
          onPing={handlePing}
          pinging={pinging}
        />
      )}

      {/* TAB 1: INTERACTIVE API CONSOLE (MANUAL TESTING) */}
      {activeTab === "manual" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Left Column: Request Builder (7 cols) */}
            <div className="lg:col-span-7 space-y-4">
              <Card className="p-5 space-y-4">
                {/* Method & URL Bar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
                      Endpoint Request
                    </label>
                    <span className="text-[11px] text-[var(--color-text-secondary)]">
                      Supports full URL or relative path
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={manualMethod}
                      onChange={(e) => setManualMethod(e.target.value)}
                      className={`rounded-xl border px-3 py-2.5 font-mono text-xs font-bold text-center transition-colors focus:outline-none ${
                        METHOD_COLORS[manualMethod] || "border-[var(--color-border)] bg-[var(--color-surface)]"
                      }`}
                    >
                      <option value="GET">GET</option>
                      <option value="POST">POST</option>
                      <option value="PUT">PUT</option>
                      <option value="DELETE">DELETE</option>
                      <option value="PATCH">PATCH</option>
                      <option value="OPTIONS">OPTIONS</option>
                    </select>

                    <input
                      type="text"
                      value={manualUrl}
                      onChange={(e) => setManualUrl(e.target.value)}
                      placeholder="http://localhost:5001/api/login or /api/login"
                      className="flex-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 font-mono text-xs text-[var(--color-text-primary)] focus:border-[var(--color-primary)] focus:outline-none"
                    />

                    <Button
                      variant="primary"
                      onClick={handleSendManualRequest}
                      loading={manualSending}
                      className="px-4 text-xs font-semibold shrink-0"
                    >
                      <Send size={13} />
                      <span>Send</span>
                    </Button>
                  </div>

                  {/* Quick Endpoints Presets */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[10px] text-[var(--color-text-secondary)] font-medium">Shortcuts:</span>
                    {[
                      { method: "POST", path: "/api/login", label: "POST /api/login (Login)", body: '{\n  "username": "manas",\n  "password": "password123"\n}' },
                      { method: "GET", path: "/api/user", label: "GET /api/user (Protected Profile)", body: "" },
                    ].map((ep) => (
                      <button
                        key={`${ep.method}-${ep.path}`}
                        type="button"
                        onClick={() => {
                          setManualMethod(ep.method);
                          setManualUrl(`${baseUrl.replace(/\/+$/, "")}${ep.path}`);
                          if (ep.body) setManualBody(ep.body);
                          if (ep.method === "GET" && detectedToken) {
                            setManualAuthType("bearer");
                            setManualBearerToken(detectedToken);
                          }
                        }}
                        className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-elevated)]/60 px-2 py-0.5 font-mono text-[10px] text-[var(--color-text-secondary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors"
                      >
                        {ep.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sub-tabs for Request: Body | Headers | Auth | Assertions */}
                <div className="border-t border-[var(--color-border)] pt-3">
                  <div className="flex items-center gap-1 border-b border-[var(--color-border)] pb-2 text-xs font-medium">
                    <button
                      onClick={() => setManualReqTab("body")}
                      className={`rounded-lg px-3 py-1.5 transition-colors ${
                        manualReqTab === "body"
                          ? "bg-[var(--color-surface-elevated)] font-bold text-[var(--color-primary)]"
                          : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                      }`}
                    >
                      Body (JSON)
                    </button>
                    <button
                      onClick={() => setManualReqTab("headers")}
                      className={`rounded-lg px-3 py-1.5 transition-colors flex items-center gap-1.5 ${
                        manualReqTab === "headers"
                          ? "bg-[var(--color-surface-elevated)] font-bold text-[var(--color-primary)]"
                          : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                      }`}
                    >
                      <span>Headers</span>
                      <span className="rounded-full bg-[var(--color-surface-elevated)] px-1.5 text-[10px]">
                        {manualHeaders.filter((h) => h.enabled).length + (manualAuthType === "bearer" ? 1 : 0)}
                      </span>
                    </button>
                    <button
                      onClick={() => setManualReqTab("auth")}
                      className={`rounded-lg px-3 py-1.5 transition-colors flex items-center gap-1.5 ${
                        manualReqTab === "auth"
                          ? "bg-[var(--color-surface-elevated)] font-bold text-[var(--color-primary)]"
                          : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                      }`}
                    >
                      <span>Auth</span>
                      {manualAuthType === "bearer" && (
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      )}
                    </button>
                    <button
                      onClick={() => setManualReqTab("assertions")}
                      className={`rounded-lg px-3 py-1.5 transition-colors ${
                        manualReqTab === "assertions"
                          ? "bg-[var(--color-surface-elevated)] font-bold text-[var(--color-primary)]"
                          : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                      }`}
                    >
                      Assertions & Validation
                    </button>
                  </div>

                  {/* TAB CONTENT: BODY */}
                  {manualReqTab === "body" && (
                    <div className="space-y-2 pt-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-[var(--color-text-secondary)]">
                          Content-Type: application/json
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              try {
                                const parsed = JSON.parse(manualBody);
                                setManualBody(JSON.stringify(parsed, null, 2));
                              } catch {}
                            }}
                            className="text-[11px] text-[var(--color-primary)] hover:underline"
                          >
                            Format JSON
                          </button>
                          <span className="text-gray-400">·</span>
                          <button
                            type="button"
                            onClick={() => {
                              setManualBody('{\n  "username": "manas",\n  "password": "password123"\n}');
                            }}
                            className="text-[11px] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                          >
                            Load Login Template
                          </button>
                        </div>
                      </div>

                      <textarea
                        rows={8}
                        value={manualBody}
                        onChange={(e) => setManualBody(e.target.value)}
                        placeholder='{\n  "key": "value"\n}'
                        className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 font-mono text-xs text-[var(--color-text-primary)] focus:border-[var(--color-primary)] focus:outline-none leading-relaxed"
                      />
                    </div>
                  )}

                  {/* TAB CONTENT: HEADERS */}
                  {manualReqTab === "headers" && (
                    <div className="space-y-3 pt-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-[var(--color-text-secondary)]">Request Headers</span>
                        <button
                          type="button"
                          onClick={() => setManualHeaders((prev) => [...prev, { key: "", value: "", enabled: true }])}
                          className="flex items-center gap-1 text-xs text-[var(--color-primary)] hover:underline"
                        >
                          <Plus size={13} />
                          <span>Add Header</span>
                        </button>
                      </div>

                      <div className="space-y-2">
                        {manualHeaders.map((hdr, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={hdr.enabled}
                              onChange={(e) => {
                                const next = [...manualHeaders];
                                next[idx].enabled = e.target.checked;
                                setManualHeaders(next);
                              }}
                              className="rounded border-[var(--color-border)]"
                            />
                            <input
                              type="text"
                              value={hdr.key}
                              onChange={(e) => {
                                const next = [...manualHeaders];
                                next[idx].key = e.target.value;
                                setManualHeaders(next);
                              }}
                              placeholder="Header Name (e.g. Accept)"
                              className="w-1/2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1.5 font-mono text-xs text-[var(--color-text-primary)]"
                            />
                            <input
                              type="text"
                              value={hdr.value}
                              onChange={(e) => {
                                const next = [...manualHeaders];
                                next[idx].value = e.target.value;
                                setManualHeaders(next);
                              }}
                              placeholder="Header Value"
                              className="flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1.5 font-mono text-xs text-[var(--color-text-primary)]"
                            />
                            <button
                              type="button"
                              onClick={() => setManualHeaders((prev) => prev.filter((_, i) => i !== idx))}
                              className="p-1 text-[var(--color-text-secondary)] hover:text-[var(--color-error)]"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                      </div>

                      {/* Quick Add Presets */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-[var(--color-border)]">
                        <span className="text-[10px] text-[var(--color-text-secondary)]">Quick Add:</span>
                        {[
                          { key: "Content-Type", value: "application/json" },
                          { key: "Accept", value: "application/json" },
                          { key: "User-Agent", value: "Agent24-APIExecutor/1.0" },
                        ].map((q) => (
                          <button
                            key={q.key}
                            type="button"
                            onClick={() => {
                              if (!manualHeaders.some((h) => h.key === q.key)) {
                                setManualHeaders((prev) => [...prev, { key: q.key, value: q.value, enabled: true }]);
                              }
                            }}
                            className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-elevated)]/60 px-2 py-0.5 text-[10px] text-[var(--color-text-secondary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                          >
                            + {q.key}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* TAB CONTENT: AUTH */}
                  {manualReqTab === "auth" && (
                    <div className="space-y-3 pt-3">
                      <div>
                        <label className="text-xs font-medium text-[var(--color-text-secondary)]">Authentication Type</label>
                        <select
                          value={manualAuthType}
                          onChange={(e) => setManualAuthType(e.target.value as any)}
                          className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-xs text-[var(--color-text-primary)]"
                        >
                          <option value="none">No Auth (Public / Open)</option>
                          <option value="bearer">Bearer Token (JWT / OAuth)</option>
                        </select>
                      </div>

                      {manualAuthType === "bearer" && (
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-[var(--color-text-secondary)] flex items-center justify-between">
                            <span>Token Value</span>
                            {detectedToken && (
                              <button
                                type="button"
                                onClick={() => setManualBearerToken(detectedToken)}
                                className="text-[11px] text-[var(--color-primary)] hover:underline flex items-center gap-1"
                              >
                                <Sparkles size={12} />
                                <span>Paste Detected Token</span>
                              </button>
                            )}
                          </label>
                          <textarea
                            rows={3}
                            value={manualBearerToken}
                            onChange={(e) => setManualBearerToken(e.target.value)}
                            placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-2.5 font-mono text-xs text-[var(--color-text-primary)]"
                          />
                          <p className="text-[11px] text-[var(--color-text-secondary)]">
                            This token will be sent in the <code>Authorization: Bearer &lt;token&gt;</code> header.
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB CONTENT: ASSERTIONS */}
                  {manualReqTab === "assertions" && (
                    <div className="space-y-3 pt-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-medium text-[var(--color-text-secondary)]">Expected Status Code</label>
                          <input
                            type="number"
                            value={manualExpectedStatus}
                            onChange={(e) => setManualExpectedStatus(e.target.value)}
                            placeholder="200"
                            className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 font-mono text-xs text-[var(--color-text-primary)]"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-medium text-[var(--color-text-secondary)]">Response Contains Substring</label>
                          <input
                            type="text"
                            value={manualExpectedContains}
                            onChange={(e) => setManualExpectedContains(e.target.value)}
                            placeholder="Login successful or access_token"
                            className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 font-mono text-xs text-[var(--color-text-primary)]"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            </div>

            {/* Right Column: Live Response Inspector (5 cols) */}
            <div className="lg:col-span-5 space-y-4">
              <Card className="p-5 space-y-3 min-h-[460px] flex flex-col">
                <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
                  <div className="flex items-center gap-2">
                    <ExternalLink size={15} className="text-[var(--color-primary)]" />
                    <h3 className="font-display text-sm font-semibold text-[var(--color-text-primary)]">
                      Response Inspector
                    </h3>
                  </div>

                  {manualResponse && (
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-lg px-2.5 py-0.5 font-mono text-xs font-bold ${
                          manualResponse.status_code >= 200 && manualResponse.status_code < 300
                            ? "bg-emerald-500/15 text-emerald-600 border border-emerald-500/30"
                            : manualResponse.status_code === 0
                            ? "bg-rose-500/15 text-rose-600 border border-rose-500/30"
                            : "bg-amber-500/15 text-amber-600 border border-amber-500/30"
                        }`}
                      >
                        {manualResponse.status_code === 0 ? "CONN FAIL" : `HTTP ${manualResponse.status_code}`}
                      </span>

                      <span className="flex items-center gap-1 font-mono text-[11px] text-[var(--color-text-secondary)]">
                        <Clock size={12} />
                        {manualResponse.duration_ms}ms
                      </span>
                    </div>
                  )}
                </div>

                {/* Response Body or Empty State */}
                {!manualResponse ? (
                  <div className="flex-1 flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--color-border)] p-8 text-center">
                    <Terminal size={32} className="text-[var(--color-text-secondary)]/40 mb-2" />
                    <p className="text-xs font-medium text-[var(--color-text-primary)]">No response yet</p>
                    <p className="text-[11px] text-[var(--color-text-secondary)] mt-1 max-w-xs">
                      Configure your request on the left and click <strong>Send</strong> to inspect live status, headers, and payload.
                    </p>
                  </div>
                ) : (
                  <div className="flex-1 space-y-3">
                    {/* Auto-extracted token banner */}
                    {detectedToken && (
                      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-800 flex items-center justify-between">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <Key size={14} className="text-amber-600 shrink-0" />
                          <span className="font-medium truncate">
                            Auth Token captured: <code className="font-mono text-[10px]">{detectedToken.slice(0, 16)}...</code>
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setManualAuthType("bearer");
                              setManualBearerToken(detectedToken);
                              setStatusMessage({ type: "success", text: "Bearer token applied to Auth tab!" });
                            }}
                            className="rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-900 hover:bg-amber-500/30 transition-colors"
                          >
                            Use as Auth
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCopy(detectedToken, "det-token")}
                            className="rounded p-1 text-amber-900 hover:opacity-75"
                            title="Copy Token"
                          >
                            {copiedKey === "det-token" ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Response Sub-tabs */}
                    <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-2">
                      <div className="flex items-center gap-1 text-xs">
                        <button
                          onClick={() => setManualRespTab("body")}
                          className={`rounded px-2 py-1 font-medium ${
                            manualRespTab === "body"
                              ? "bg-[var(--color-surface-elevated)] font-bold text-[var(--color-primary)]"
                              : "text-[var(--color-text-secondary)]"
                          }`}
                        >
                          Response Body
                        </button>
                        <button
                          onClick={() => setManualRespTab("headers")}
                          className={`rounded px-2 py-1 font-medium ${
                            manualRespTab === "headers"
                              ? "bg-[var(--color-surface-elevated)] font-bold text-[var(--color-primary)]"
                              : "text-[var(--color-text-secondary)]"
                          }`}
                        >
                          Headers
                        </button>
                        <button
                          onClick={() => setManualRespTab("assertions")}
                          className={`rounded px-2 py-1 font-medium ${
                            manualRespTab === "assertions"
                              ? "bg-[var(--color-surface-elevated)] font-bold text-[var(--color-primary)]"
                              : "text-[var(--color-text-secondary)]"
                          }`}
                        >
                          Assertions ({manualResponse.assertions?.length || 0})
                        </button>
                      </div>

                      {manualRespTab === "body" && manualResponse.resp_body && (
                        <button
                          type="button"
                          onClick={() => handleCopy(manualResponse.resp_body, "resp-body")}
                          className="flex items-center gap-1 text-[11px] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                        >
                          {copiedKey === "resp-body" ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                          <span>{copiedKey === "resp-body" ? "Copied" : "Copy"}</span>
                        </button>
                      )}
                    </div>

                    {/* Response Tab: Body */}
                    {manualRespTab === "body" && (
                      <div className="rounded-xl border border-[var(--color-border)] bg-black/40 p-3 font-mono text-xs max-h-72 overflow-y-auto">
                        <pre className="text-emerald-400 whitespace-pre-wrap leading-relaxed">
                          {manualResponse.resp_body
                            ? (() => {
                                try {
                                  return JSON.stringify(JSON.parse(manualResponse.resp_body), null, 2);
                                } catch {
                                  return manualResponse.resp_body;
                                }
                              })()
                            : "<Empty Response>"}
                        </pre>
                      </div>
                    )}

                    {/* Response Tab: Headers */}
                    {manualRespTab === "headers" && (
                      <div className="rounded-xl border border-[var(--color-border)] bg-black/40 p-3 font-mono text-[11px] text-gray-300 max-h-72 overflow-y-auto space-y-1">
                        {manualResponse.resp_headers && Object.keys(manualResponse.resp_headers).length > 0 ? (
                          Object.entries(manualResponse.resp_headers).map(([k, v]) => (
                            <div key={k} className="flex items-start gap-2">
                              <span className="text-gray-400 font-semibold">{k}:</span>
                              <span className="text-gray-200 break-all">{String(v)}</span>
                            </div>
                          ))
                        ) : (
                          <span className="text-gray-500">No response headers recorded</span>
                        )}
                      </div>
                    )}

                    {/* Response Tab: Assertions */}
                    {manualRespTab === "assertions" && (
                      <div className="space-y-2 max-h-72 overflow-y-auto">
                        {manualResponse.assertions && manualResponse.assertions.length > 0 ? (
                          manualResponse.assertions.map((a: any, idx: number) => (
                            <div
                              key={idx}
                              className={`flex items-start gap-2 rounded-lg border p-2.5 text-xs ${
                                a.passed
                                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700"
                                  : "border-rose-500/30 bg-rose-500/10 text-rose-700"
                              }`}
                            >
                              {a.passed ? (
                                <CheckCircle2 size={16} className="text-emerald-500 mt-0.5 shrink-0" />
                              ) : (
                                <XCircle size={16} className="text-rose-500 mt-0.5 shrink-0" />
                              )}
                              <div>
                                <p className="font-semibold">{a.name}</p>
                                {a.error && <p className="font-mono text-[11px] mt-0.5">{a.error}</p>}
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-[var(--color-text-secondary)]">No assertions defined</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: EXECUTION HISTORY */}
      {activeTab === "history" && (
        <Card className="p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
            <div>
              <h2 className="font-display text-sm font-semibold text-[var(--color-text-primary)]">
                API Test Execution Runs
              </h2>
              <p className="text-xs text-[var(--color-text-secondary)]">
                Historical audit log of all test executions and verified runs.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {selectedHistoryRun && (
                <Button
                  variant="secondary"
                  onClick={() => setSelectedHistoryRun(null)}
                  className="text-xs"
                >
                  <span>← Back to All Runs</span>
                </Button>
              )}
              <Button variant="secondary" onClick={loadExecutionHistory} loading={loadingHistory} className="text-xs">
                <RefreshCw size={13} />
                <span>Refresh</span>
              </Button>
            </div>
          </div>

          {selectedHistoryRun ? (
            /* Detailed Run View */
            <div className="space-y-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)]/30">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-[var(--color-text-primary)]">
                      {selectedHistoryRun.collection_name || selectedHistoryRun.collection || "Test Suite Execution"}
                    </h3>
                    <StatusBadge status={selectedHistoryRun.status} />
                    <span className="rounded bg-[var(--color-surface)] border border-[var(--color-border)] px-2 py-0.5 font-mono text-[10px] text-[var(--color-text-secondary)]">
                      {selectedHistoryRun.runner}
                    </span>
                  </div>
                  <p className="font-mono text-xs text-[var(--color-text-secondary)]">
                    Target: {selectedHistoryRun.base_url || "Local"} · Executed: {selectedHistoryRun.created_at ? new Date(selectedHistoryRun.created_at).toLocaleString() : ""}
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm font-bold text-emerald-600">
                      {selectedHistoryRun.passed}/{selectedHistoryRun.total} Passed
                    </p>
                    <p className="text-[10px] text-[var(--color-text-secondary)]">
                      {calculatePassRate(selectedHistoryRun)}% Success
                    </p>
                  </div>
                </div>
              </div>

              {/* Endpoints Table */}
              <div className="rounded-xl border border-[var(--color-border)] overflow-hidden">
                <table className="w-full border-collapse text-left text-xs">
                  <thead className="bg-[var(--color-surface-elevated)]/60 text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)] border-b border-[var(--color-border)]">
                    <tr>
                      <th className="py-2.5 px-3">Method</th>
                      <th className="py-2.5 px-3">Endpoint / Test</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      <th className="py-2.5 px-3 text-right">Latency</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border)]">
                    {selectedHistoryRun.results?.map((res, idx) => (
                      <tr key={idx} className="hover:bg-[var(--color-surface-elevated)]/30 transition-colors">
                        <td className="py-2.5 px-3">
                          <span
                            className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-bold ${
                              METHOD_COLORS[(res.method || "GET").toUpperCase()] || ""
                            }`}
                          >
                            {res.method || "GET"}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="font-semibold text-[var(--color-text-primary)]">
                            {res.test_key || res.test_case_title || res.url || "Endpoint"}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`rounded px-2 py-0.5 font-mono text-[10px] font-bold ${
                              res.passed
                                ? "bg-emerald-500/15 text-emerald-600"
                                : "bg-rose-500/15 text-rose-600"
                            }`}
                          >
                            HTTP {res.status_code}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-xs text-[var(--color-text-secondary)]">
                          {res.duration_ms}ms
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <Button
                            variant="secondary"
                            onClick={() => setInspectedResult(res)}
                            className="text-[10px] px-2 py-1"
                          >
                            Inspect
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : loadingHistory ? (
            <Loading />
          ) : runHistory.length === 0 ? (
            <div className="py-12 text-center text-xs text-[var(--color-text-secondary)]">
              No previous runs recorded. Execute tests from Autonomous Agent or Interactive Console.
            </div>
          ) : (
            <div className="divide-y divide-[var(--color-border)]">
              {runHistory.map((run) => (
                <div
                  key={run.uuid}
                  className="flex items-center justify-between py-3 hover:bg-[var(--color-surface-elevated)]/30 px-2 rounded-lg transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-[var(--color-text-primary)]">
                        {run.collection_name || run.collection || "Test Run"}
                      </span>
                      <span className="rounded bg-[var(--color-surface-elevated)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--color-text-secondary)]">
                        {run.runner}
                      </span>
                      {run.is_mock ? (
                        <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-600">
                          MOCK
                        </span>
                      ) : null}
                    </div>
                    <p className="font-mono text-[11px] text-[var(--color-text-secondary)]">
                      Target: {run.base_url || "Local"} · {run.created_at ? new Date(run.created_at).toLocaleString() : ""}
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-xs font-semibold text-[var(--color-text-primary)]">
                        {run.passed}/{run.total} Passed
                      </p>
                      <p className="text-[10px] text-[var(--color-text-secondary)]">
                        {calculatePassRate(run)}% Success
                      </p>
                    </div>
                    <StatusBadge status={run.status} />
                    <Button
                      variant="secondary"
                      onClick={async () => {
                        try {
                          const detailed = await apiExecutorApi.getRun(run.uuid);
                          setSelectedHistoryRun(detailed);
                        } catch {
                          setStatusMessage({ type: "error", text: "Failed to load run details" });
                        }
                      }}
                      className="text-xs py-1 px-2.5"
                    >
                      <span>Inspect</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* INSPECTION MODAL */}
      <AnimatePresence>
        {inspectedResult && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-2xl space-y-5"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-4">
                <div className="flex items-center gap-3">
                  {inspectedResult.passed ? (
                    <CheckCircle2 size={22} className="text-emerald-500" />
                  ) : (
                    <XCircle size={22} className="text-rose-500" />
                  )}
                  <div>
                    <h3 className="font-display text-base font-bold text-[var(--color-text-primary)]">
                      {inspectedResult.test_key || inspectedResult.test_case_title || "Endpoint Inspection"}
                    </h3>
                    <p className="font-mono text-xs text-[var(--color-text-secondary)] flex items-center gap-2 mt-0.5">
                      <span
                        className={`rounded px-1.5 py-0.2 font-mono text-[10px] font-bold ${
                          METHOD_COLORS[(inspectedResult.method || "GET").toUpperCase()] || ""
                        }`}
                      >
                        {(inspectedResult.method || "GET").toUpperCase()}
                      </span>
                      <span>{inspectedResult.url || inspectedResult.test_key || ""}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`font-mono text-xs font-bold px-2 py-1 rounded ${
                      inspectedResult.status_code >= 200 && inspectedResult.status_code < 300
                        ? "bg-emerald-500/10 text-emerald-600"
                        : "bg-rose-500/10 text-rose-600"
                    }`}
                  >
                    HTTP {inspectedResult.status_code}
                  </span>
                  <button
                    onClick={() => setInspectedResult(null)}
                    className="rounded-lg p-1.5 text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-elevated)] hover:text-[var(--color-text-primary)]"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Assertions Box */}
              {inspectedResult.assertions && inspectedResult.assertions.length > 0 && (
                <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)]/40 p-4 space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
                    Assertion Results
                  </h4>
                  <div className="space-y-1.5">
                    {inspectedResult.assertions.map((a, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs">
                        {a.passed ? (
                          <CheckCircle2 size={15} className="text-emerald-500 mt-0.5 shrink-0" />
                        ) : (
                          <XCircle size={15} className="text-rose-500 mt-0.5 shrink-0" />
                        )}
                        <div>
                          <span className={a.passed ? "text-[var(--color-text-primary)]" : "text-rose-600 font-medium"}>
                            {a.name}
                          </span>
                          {a.error && <p className="font-mono text-[11px] text-rose-500 mt-0.5">{a.error}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Request & Response Split View */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {/* Request Details */}
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] flex items-center gap-1.5">
                    <Code size={14} className="text-[var(--color-primary)]" />
                    <span>HTTP Request</span>
                  </h4>
                  <div className="rounded-xl border border-[var(--color-border)] bg-black/40 p-3 font-mono text-xs text-gray-200 space-y-2 max-h-72 overflow-y-auto">
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded px-1.5 py-0.2 font-mono text-[10px] font-bold ${
                          METHOD_COLORS[(inspectedResult.method || "GET").toUpperCase()] || "text-gray-400"
                        }`}
                      >
                        {(inspectedResult.method || "GET").toUpperCase()}
                      </span>
                      <span className="text-emerald-400 break-all">{inspectedResult.url || inspectedResult.test_key}</span>
                    </div>
                    {inspectedResult.req_headers && Object.keys(inspectedResult.req_headers).length > 0 && (
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-gray-400">Headers:</p>
                        <pre className="text-[11px] text-gray-300">
                          {JSON.stringify(inspectedResult.req_headers, null, 2)}
                        </pre>
                      </div>
                    )}
                    {inspectedResult.req_body && (
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-gray-400">Body:</p>
                        <pre className="text-[11px] text-blue-300 whitespace-pre-wrap">
                          {typeof inspectedResult.req_body === "string"
                            ? inspectedResult.req_body
                            : JSON.stringify(inspectedResult.req_body, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>

                {/* Response Details */}
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] flex items-center gap-1.5">
                    <ExternalLink size={14} className="text-emerald-500" />
                    <span>HTTP Response</span>
                  </h4>
                  <div className="rounded-xl border border-[var(--color-border)] bg-black/40 p-3 font-mono text-xs text-gray-200 space-y-2 max-h-72 overflow-y-auto">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Status:</span>
                      <span
                        className={
                          inspectedResult.status_code >= 200 && inspectedResult.status_code < 300
                            ? "text-emerald-400 font-bold"
                            : "text-rose-400 font-bold"
                        }
                      >
                        HTTP {inspectedResult.status_code}
                      </span>
                    </div>
                    {inspectedResult.resp_headers && Object.keys(inspectedResult.resp_headers).length > 0 && (
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-gray-400">Headers:</p>
                        <pre className="text-[11px] text-gray-300">
                          {JSON.stringify(inspectedResult.resp_headers, null, 2)}
                        </pre>
                      </div>
                    )}
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-gray-400">Response Body:</p>
                      <pre className="text-[11px] text-emerald-300 whitespace-pre-wrap">
                        {inspectedResult.resp_body
                          ? (() => {
                              try {
                                return JSON.stringify(JSON.parse(inspectedResult.resp_body), null, 2);
                              } catch {
                                return inspectedResult.resp_body;
                              }
                            })()
                          : "<Empty Response>"}
                      </pre>
                    </div>
                  </div>
                </div>
              </div>

              {/* Close Footer */}
              <div className="flex justify-end pt-2">
                <Button variant="secondary" onClick={() => setInspectedResult(null)}>
                  Close
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
