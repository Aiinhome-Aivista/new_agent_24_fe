import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  Plus,
  Trash2,
  FileJson,
  BookOpen,
  Send,
  RefreshCw,
  FolderKanban,
  History,
  SlidersHorizontal,
  ChevronRight,
  Code,
  AlertCircle,
  Layers,
  ArrowUpRight,
  Terminal,
  Copy,
  Check,
  Key,
  Activity,
  Zap,
  Sparkles,
} from "lucide-react";
import { apiExecutorApi } from "@/services/api/apiExecutorApi";
import { projectApi } from "@/services/api/projectApi";
import { storyApi } from "@/services/api/storyApi";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { KpiCard } from "@/components/ui/KpiCard";
import { Loading } from "@/components/ui/Loading";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { ApiEndpointItem, ExecutionRun, ExecutionResultItem, Project, Story } from "@/types";

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

  // Navigation tabs: "manual" (Interactive Console) | "suite" (Batch Runner) | "history" (Run History)
  const [activeTab, setActiveTab] = useState<"manual" | "suite" | "history">("manual");
  const [sourceMode, setSourceMode] = useState<"story" | "postman" | "manual">("story");

  // Global Connection Configuration
  const [baseUrl, setBaseUrl] = useState("http://localhost:5001");
  const [runnerType, setRunnerType] = useState<"auto" | "http" | "newman" | "mock">("auto");
  const [endpoints, setEndpoints] = useState<ApiEndpointItem[]>([]);
  const [collectionName, setCollectionName] = useState<string>("");

  // Target Ping State
  const [pinging, setPinging] = useState(false);
  const [pingResult, setPingResult] = useState<{ reachable: boolean; latency_ms?: number; status_code?: number; error?: string } | null>(null);

  // Projects & Stories for Import
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

  // Suite builder endpoint entry state
  const [newMethod, setNewMethod] = useState("GET");
  const [newPath, setNewPath] = useState("");
  const [newKey, setNewKey] = useState("");
  const [newExpectedStatus, setNewExpectedStatus] = useState("200");
  const [newBody, setNewBody] = useState("");
  const [newContains, setNewContains] = useState("");

  // Postman JSON paste state
  const [postmanJsonText, setPostmanJsonText] = useState("");

  // Suite Execution State
  const [isRunning, setIsRunning] = useState(false);
  const [latestRun, setLatestRun] = useState<ExecutionRun | null>(null);
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

  // Add current manual endpoint to Test Suite
  const handleAddManualToSuite = () => {
    const cleanPath = manualUrl.trim();
    if (!cleanPath) {
      setStatusMessage({ type: "error", text: "Endpoint URL or path is required" });
      return;
    }

    // Build headers
    const headersMap: Record<string, string> = {};
    manualHeaders.forEach((h) => {
      if (h.enabled && h.key.trim()) {
        headersMap[h.key.trim()] = h.value;
      }
    });
    if (manualAuthType === "bearer" && manualBearerToken.trim()) {
      headersMap["Authorization"] = `Bearer ${manualBearerToken.trim()}`;
    }

    const newEp: ApiEndpointItem = {
      id: Date.now(),
      test_key: `${manualMethod} ${cleanPath.replace(/^https?:\/\/[^/]+/, "") || cleanPath}`,
      name: `${manualMethod} ${cleanPath}`,
      method: manualMethod,
      path: cleanPath,
      expected_status_code: parseInt(manualExpectedStatus, 10) || 200,
      expected_body_contains: manualExpectedContains.trim() || undefined,
      body: ["GET", "DELETE"].includes(manualMethod) ? undefined : manualBody.trim() || undefined,
      headers: headersMap,
      assertions: [`Status code is ${manualExpectedStatus}`],
    };

    setEndpoints((prev) => [...prev, newEp]);
    setStatusMessage({
      type: "success",
      text: `Added ${manualMethod} ${cleanPath} to Test Suite Queue (${endpoints.length + 1} endpoints total).`,
    });
  };

  // Import Story Test Cases
  const handleImportStoryTestCases = async () => {
    if (!selectedStoryUuid) {
      setStatusMessage({ type: "error", text: "Please select a story first." });
      return;
    }
    setStatusMessage(null);
    try {
      const res = await apiExecutorApi.getStoryTestCases(selectedStoryUuid);
      if (res.test_cases && res.test_cases.length > 0) {
        setEndpoints(res.test_cases);
        setCollectionName(`${res.story.external_key || "STORY"}: ${res.story.title}`);
        setStatusMessage({
          type: "success",
          text: `Loaded ${res.test_cases.length} test cases from story ${res.story.external_key || ""}`,
        });
      } else {
        setStatusMessage({
          type: "info",
          text: "No generated test cases found for this story. Generate tests in the workflow first or use Postman/Manual endpoints.",
        });
      }
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err?.message || "Failed to load story test cases" });
    }
  };

  // Upload Postman File
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setStatusMessage(null);
    try {
      const res = await apiExecutorApi.parseCollectionFile(file);
      setEndpoints(res.endpoints || []);
      setCollectionName(res.collection_name);
      setStatusMessage({
        type: "success",
        text: `Imported ${res.total} endpoints from collection "${res.collection_name}"`,
      });
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err?.message || "Failed to parse collection file" });
    }
  };

  // Parse Raw Postman JSON
  const handleParseJson = async () => {
    if (!postmanJsonText.trim()) return;
    setStatusMessage(null);
    try {
      const parsed = JSON.parse(postmanJsonText);
      const res = await apiExecutorApi.parseCollectionJson(parsed);
      setEndpoints(res.endpoints || []);
      setCollectionName(res.collection_name);
      setStatusMessage({
        type: "success",
        text: `Parsed ${res.total} endpoints from JSON`,
      });
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err?.message || "Invalid JSON or unsupported collection format" });
    }
  };

  // Add Manual Endpoint in Suite Builder
  const handleAddSuiteManualEndpoint = () => {
    if (!newPath.trim()) {
      setStatusMessage({ type: "error", text: "Endpoint path is required (e.g. /api/v1/resource or full URL)" });
      return;
    }
    const cleanPath = newPath.trim().startsWith("http://") || newPath.trim().startsWith("https://")
      ? newPath.trim()
      : newPath.trim().startsWith("/")
      ? newPath.trim()
      : `/${newPath.trim()}`;

    const newEp: ApiEndpointItem = {
      id: Date.now(),
      test_key: newKey.trim() || `TC-${endpoints.length + 1}`,
      name: newKey.trim() || `${newMethod} ${cleanPath}`,
      method: newMethod,
      path: cleanPath,
      expected_status_code: parseInt(newExpectedStatus, 10) || 200,
      expected_body_contains: newContains.trim() || undefined,
      body: newBody.trim() || undefined,
      headers: { "Content-Type": "application/json" },
      assertions: [`Status code is ${newExpectedStatus}`],
    };

    setEndpoints((prev) => [...prev, newEp]);
    setNewPath("");
    setNewKey("");
    setNewBody("");
    setNewContains("");
    setStatusMessage({ type: "success", text: `Added endpoint ${newMethod} ${cleanPath}` });
  };

  const handleRemoveEndpoint = (index: number) => {
    setEndpoints((prev) => prev.filter((_, i) => i !== index));
  };

  // Execute Batch Suite
  const handleRunTests = async () => {
    if (!baseUrl.trim()) {
      setStatusMessage({ type: "error", text: "Target Base URL is required (e.g. http://localhost:5001)" });
      return;
    }
    if (endpoints.length === 0) {
      setStatusMessage({ type: "error", text: "Add at least one endpoint or import a story/collection to test." });
      return;
    }

    setIsRunning(true);
    setStatusMessage(null);
    setLatestRun(null);

    try {
      const runResult = await apiExecutorApi.runTests({
        base_url: baseUrl.trim(),
        endpoints,
        collection_name: collectionName || "Standalone Suite",
        project_uuid: selectedProjectUuid || undefined,
        story_uuid: selectedStoryUuid || undefined,
        runner_type: runnerType,
        is_mock: runnerType === "mock",
      });

      setLatestRun(runResult);
      setStatusMessage({
        type: runResult.failed === 0 ? "success" : "info",
        text: `Suite execution completed: ${runResult.passed}/${runResult.total} passed (${Math.round((runResult.passed / (runResult.total || 1)) * 100)}%)`,
      });
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err?.message || "Execution failed. Ensure base URL is accessible." });
    } finally {
      setIsRunning(false);
    }
  };

  const calculatePassRate = (run: ExecutionRun) => {
    if (!run || run.total === 0) return 0;
    return Math.round((run.passed / run.total) * 100);
  };

  const calculateAvgDuration = (results?: ExecutionResultItem[]) => {
    if (!results || results.length === 0) return 0;
    const sum = results.reduce((acc, r) => acc + (r.duration_ms || 0), 0);
    return Math.round(sum / results.length);
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
            Test local and deployed APIs directly with instant manual requests or automated test suites.
          </p>
        </div>

        {/* View Switcher: Manual Console | Suite Runner | Run History */}
        <div className="flex items-center gap-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-1 shadow-sm">
          <button
            onClick={() => setActiveTab("manual")}
            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              activeTab === "manual"
                ? "bg-[var(--color-primary)] text-white shadow-sm font-semibold"
                : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            }`}
          >
            <Terminal size={14} />
            <span>Interactive Console</span>
          </button>
          <button
            onClick={() => setActiveTab("suite")}
            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              activeTab === "suite"
                ? "bg-[var(--color-primary)] text-white shadow-sm font-semibold"
                : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            }`}
          >
            <Layers size={14} />
            <span>Suite Runner</span>
            {endpoints.length > 0 && (
              <span className="ml-1 rounded-full bg-black/20 px-1.5 py-0.2 text-[10px] font-bold">
                {endpoints.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
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

      {/* Target Base URL & Execution Engine Configuration */}
      <Card className="space-y-4 border-[var(--color-border-orange)]/30 bg-gradient-to-br from-[var(--color-surface)] to-[var(--color-surface-elevated)]/40 p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex-1 space-y-1.5">
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
                className="text-xs px-3 py-2.5 shrink-0"
                title="Check if host is reachable"
              >
                <Zap size={13} className="text-[var(--color-primary)]" />
                <span>Test Connection</span>
              </Button>
            </div>

            {/* Presets */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
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

          {/* Engine Selector */}
          <div className="w-full lg:w-64 space-y-1.5">
            <label className="text-xs font-semibold text-[var(--color-text-primary)]">
              Execution Engine
            </label>
            <select
              value={runnerType}
              onChange={(e) => setRunnerType(e.target.value as any)}
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-xs text-[var(--color-text-primary)] focus:border-[var(--color-primary)] focus:outline-none"
            >
              <option value="auto">Auto (HTTP Direct / Newman Fallback)</option>
              <option value="http">Direct HTTP Runner (Requests)</option>
              <option value="newman">Newman CLI Runner</option>
              <option value="mock">Simulated Mock Engine</option>
            </select>
            <p className="text-[10px] text-[var(--color-text-secondary)]">
              {runnerType === "auto" && "Auto-resolves variables & tokens across requests."}
              {runnerType === "http" && "Fastest native Python HTTP requests with variable chaining."}
              {runnerType === "newman" && "Runs via Newman CLI if available."}
              {runnerType === "mock" && "Deterministic mock responses for demo/testing."}
            </p>
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

                    <Button
                      variant="secondary"
                      onClick={handleAddManualToSuite}
                      className="px-3 text-xs shrink-0"
                      title="Add to Automated Test Suite"
                    >
                      <Plus size={14} />
                      <span>Queue</span>
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

      {/* TAB 2: AUTOMATED SUITE RUNNER */}
      {activeTab === "suite" && (
        <div className="space-y-6">
          {/* Source Selection & Import Section */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Left Column: Import / Source Controls */}
            <div className="space-y-4 lg:col-span-1">
              <Card className="p-4 space-y-4">
                <h2 className="font-display text-sm font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
                  <SlidersHorizontal size={15} className="text-[var(--color-primary)]" />
                  <span>Choose Test Source</span>
                </h2>

                <div className="grid grid-cols-3 gap-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)]/50 p-1">
                  <button
                    onClick={() => setSourceMode("story")}
                    className={`rounded-lg py-1.5 text-center text-xs font-medium transition-colors ${
                      sourceMode === "story"
                        ? "bg-[var(--color-surface)] text-[var(--color-primary)] font-semibold shadow-sm border border-[var(--color-border-orange)]/40"
                        : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                    }`}
                  >
                    User Story
                  </button>
                  <button
                    onClick={() => setSourceMode("postman")}
                    className={`rounded-lg py-1.5 text-center text-xs font-medium transition-colors ${
                      sourceMode === "postman"
                        ? "bg-[var(--color-surface)] text-[var(--color-primary)] font-semibold shadow-sm border border-[var(--color-border-orange)]/40"
                        : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                    }`}
                  >
                    Postman
                  </button>
                  <button
                    onClick={() => setSourceMode("manual")}
                    className={`rounded-lg py-1.5 text-center text-xs font-medium transition-colors ${
                      sourceMode === "manual"
                        ? "bg-[var(--color-surface)] text-[var(--color-primary)] font-semibold shadow-sm border border-[var(--color-border-orange)]/40"
                        : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                    }`}
                  >
                    Custom
                  </button>
                </div>

                {/* MODE 1: STORY TEST CASES */}
                {sourceMode === "story" && (
                  <div className="space-y-3 pt-1">
                    <div>
                      <label className="text-xs font-medium text-[var(--color-text-secondary)]">Select Story</label>
                      {loadingStories ? (
                        <div className="py-2 text-center text-xs text-[var(--color-text-secondary)]">Loading stories...</div>
                      ) : (
                        <select
                          value={selectedStoryUuid}
                          onChange={(e) => setSelectedStoryUuid(e.target.value)}
                          className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-2 text-xs text-[var(--color-text-primary)]"
                        >
                          {stories.length === 0 ? (
                            <option value="">No stories found</option>
                          ) : (
                            stories.map((s) => (
                              <option key={s.uuid} value={s.uuid}>
                                {s.external_key ? `[${s.external_key}] ` : ""}
                                {s.title}
                              </option>
                            ))
                          )}
                        </select>
                      )}
                    </div>

                    <Button
                      variant="secondary"
                      onClick={handleImportStoryTestCases}
                      disabled={!selectedStoryUuid}
                      className="w-full text-xs"
                    >
                      <BookOpen size={14} />
                      <span>Import Story Test Cases</span>
                    </Button>
                  </div>
                )}

                {/* MODE 2: POSTMAN COLLECTION */}
                {sourceMode === "postman" && (
                  <div className="space-y-3 pt-1">
                    <div>
                      <label className="text-xs font-medium text-[var(--color-text-secondary)]">Upload Collection JSON</label>
                      <input
                        type="file"
                        accept=".json"
                        onChange={handleFileUpload}
                        className="mt-1.5 w-full cursor-pointer text-xs text-[var(--color-text-secondary)] file:mr-2 file:rounded-lg file:border-0 file:bg-[var(--color-surface-elevated)] file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-[var(--color-primary)] hover:file:bg-[var(--color-surface-elevated)]/80"
                      />
                    </div>

                    <div className="relative flex items-center justify-center">
                      <div className="border-t border-[var(--color-border)] w-full" />
                      <span className="bg-[var(--color-surface)] px-2 text-[10px] text-[var(--color-text-secondary)] uppercase">
                        or paste JSON
                      </span>
                    </div>

                    <textarea
                      rows={4}
                      value={postmanJsonText}
                      onChange={(e) => setPostmanJsonText(e.target.value)}
                      placeholder='Paste Postman collection v2.1 JSON here...'
                      className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-2.5 font-mono text-[11px] text-[var(--color-text-primary)] focus:outline-none"
                    />

                    <Button
                      variant="secondary"
                      onClick={handleParseJson}
                      disabled={!postmanJsonText.trim()}
                      className="w-full text-xs"
                    >
                      <FileJson size={14} />
                      <span>Parse Collection JSON</span>
                    </Button>
                  </div>
                )}

                {/* MODE 3: MANUAL CUSTOM ENDPOINTS IN SUITE BUILDER */}
                {sourceMode === "manual" && (
                  <div className="space-y-3 pt-1">
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-xs font-medium text-[var(--color-text-secondary)]">Method</label>
                        <select
                          value={newMethod}
                          onChange={(e) => setNewMethod(e.target.value)}
                          className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-2 text-xs font-bold text-[var(--color-text-primary)]"
                        >
                          <option value="GET">GET</option>
                          <option value="POST">POST</option>
                          <option value="PUT">PUT</option>
                          <option value="DELETE">DELETE</option>
                          <option value="PATCH">PATCH</option>
                        </select>
                      </div>
                      <div className="col-span-2">
                        <label className="text-xs font-medium text-[var(--color-text-secondary)]">Exp. Status</label>
                        <input
                          type="number"
                          value={newExpectedStatus}
                          onChange={(e) => setNewExpectedStatus(e.target.value)}
                          className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-2 font-mono text-xs text-[var(--color-text-primary)]"
                          placeholder="200"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-[var(--color-text-secondary)]">Endpoint Path / URL</label>
                      <input
                        type="text"
                        value={newPath}
                        onChange={(e) => setNewPath(e.target.value)}
                        placeholder="/api/login or http://localhost:5001/api/login"
                        className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-2 font-mono text-xs text-[var(--color-text-primary)]"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-[var(--color-text-secondary)]">Name / Test Key</label>
                      <input
                        type="text"
                        value={newKey}
                        onChange={(e) => setNewKey(e.target.value)}
                        placeholder="Login Valid"
                        className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-2 text-xs text-[var(--color-text-primary)]"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-[var(--color-text-secondary)]">Request Body (JSON)</label>
                      <textarea
                        rows={2}
                        value={newBody}
                        onChange={(e) => setNewBody(e.target.value)}
                        placeholder='{"username": "manas", "password": "password123"}'
                        className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-2 font-mono text-[11px] text-[var(--color-text-primary)]"
                      />
                    </div>

                    <Button variant="secondary" onClick={handleAddSuiteManualEndpoint} className="w-full text-xs">
                      <Plus size={14} />
                      <span>Add to Suite Queue</span>
                    </Button>
                  </div>
                )}
              </Card>
            </div>

            {/* Right Column: Active Endpoints Queue */}
            <div className="space-y-4 lg:col-span-2">
              <Card className="p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
                  <div>
                    <h2 className="font-display text-sm font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
                      <Layers size={16} className="text-[var(--color-primary)]" />
                      <span>Configured Endpoints Queue</span>
                      <span className="rounded-full bg-[var(--color-surface-elevated)] px-2 py-0.5 font-mono text-xs text-[var(--color-text-secondary)]">
                        {endpoints.length}
                      </span>
                    </h2>
                    {collectionName && (
                      <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">
                        Source: <span className="font-medium text-[var(--color-text-primary)]">{collectionName}</span>
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {endpoints.length > 0 && (
                      <button
                        onClick={() => {
                          setEndpoints([]);
                          setCollectionName("");
                        }}
                        className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs text-[var(--color-error)] hover:bg-[var(--color-error)]/10 transition-colors"
                      >
                        <Trash2 size={13} />
                        <span>Clear All</span>
                      </button>
                    )}
                    <Button
                      variant="primary"
                      onClick={handleRunTests}
                      loading={isRunning}
                      disabled={endpoints.length === 0}
                      className="px-5 text-xs font-semibold"
                    >
                      <Play size={14} className="fill-current" />
                      <span>Execute Suite ({endpoints.length})</span>
                    </Button>
                  </div>
                </div>

                {/* Endpoints List */}
                {endpoints.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--color-border)] py-12 text-center">
                    <Send size={32} className="text-[var(--color-text-secondary)]/40 mb-2" />
                    <p className="text-sm font-medium text-[var(--color-text-primary)]">No endpoints configured yet</p>
                    <p className="text-xs text-[var(--color-text-secondary)] mt-1 max-w-sm">
                      Import test cases from a user story, upload a Postman collection, or queue endpoints from the Interactive Console.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                    {endpoints.map((ep, idx) => {
                      const methodColor = METHOD_COLORS[ep.method.toUpperCase()] || "bg-gray-100 text-gray-700";
                      return (
                        <div
                          key={ep.id || idx}
                          className="flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 transition-colors hover:border-[var(--color-border-orange)]"
                        >
                          <div className="flex items-center gap-3 overflow-hidden">
                            <span
                              className={`rounded-md border px-2 py-0.5 font-mono text-[11px] font-bold ${methodColor}`}
                            >
                              {ep.method.toUpperCase()}
                            </span>
                            <div className="truncate">
                              <p className="font-mono text-xs font-medium text-[var(--color-text-primary)] truncate">
                                {ep.path}
                              </p>
                              <p className="text-[11px] text-[var(--color-text-secondary)] truncate">
                                {ep.test_key || ep.name || "Test Case"} · Expected HTTP {ep.expected_status_code || 200}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {ep.body && (
                              <span className="rounded bg-[var(--color-surface-elevated)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--color-text-secondary)]">
                                JSON
                              </span>
                            )}
                            <button
                              onClick={() => handleRemoveEndpoint(idx)}
                              className="rounded p-1 text-[var(--color-text-secondary)] hover:text-[var(--color-error)] transition-colors"
                              title="Remove endpoint"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            </div>
          </div>

          {/* Execution Results Section */}
          {latestRun && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4 pt-2"
            >
              <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
                <div>
                  <h2 className="font-display text-lg font-bold text-[var(--color-text-primary)] flex items-center gap-2">
                    <CheckCircle2 size={18} className="text-emerald-500" />
                    <span>Execution Telemetry & Results</span>
                  </h2>
                  <p className="text-xs text-[var(--color-text-secondary)]">
                    Run UUID: <span className="font-mono">{latestRun.uuid}</span> · Target:{" "}
                    <span className="font-mono text-[var(--color-primary)]">{latestRun.base_url || baseUrl}</span>
                  </p>
                </div>
                <StatusBadge status={latestRun.status} />
              </div>

              {/* KPI Cards */}
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
                <KpiCard label="Total Executed" value={latestRun.total} icon={<Layers size={16} />} />
                <KpiCard label="Passed" value={latestRun.passed} icon={<CheckCircle2 size={16} className="text-emerald-500" />} />
                <KpiCard label="Failed" value={latestRun.failed} icon={<XCircle size={16} className="text-rose-500" />} />
                <KpiCard label="Pass Rate" value={calculatePassRate(latestRun)} suffix="%" icon={<ArrowUpRight size={16} />} />
                <KpiCard label="Avg Latency" value={calculateAvgDuration(latestRun.results)} suffix="ms" icon={<Clock size={16} />} />
              </div>

              {/* Child Test Results Table */}
              <Card className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
                    Endpoint Execution Log
                  </h3>
                  <span className="text-[11px] text-[var(--color-text-secondary)]">
                    Click any row to inspect full request & response payloads
                  </span>
                </div>

                <div className="divide-y divide-[var(--color-border)]">
                  {(latestRun.results || []).map((res) => {
                    const isPassed = Boolean(res.passed);
                    const resMethod = (res.method || "GET").toUpperCase();
                    return (
                      <div
                        key={res.id || res.uuid}
                        onClick={() => setInspectedResult(res)}
                        className="flex cursor-pointer items-center justify-between py-3 hover:bg-[var(--color-surface-elevated)]/40 px-2 rounded-lg transition-colors"
                      >
                        <div className="flex items-center gap-3 overflow-hidden">
                          {isPassed ? (
                            <CheckCircle2 size={17} className="text-emerald-500 shrink-0" />
                          ) : (
                            <XCircle size={17} className="text-rose-500 shrink-0" />
                          )}

                          <div className="truncate">
                            <div className="flex items-center gap-2">
                              <span
                                className={`rounded px-1.5 py-0.2 font-mono text-[10px] font-bold ${
                                  METHOD_COLORS[resMethod] || ""
                                }`}
                              >
                                {resMethod}
                              </span>
                              <span className="font-mono text-xs font-medium text-[var(--color-text-primary)]">
                                {res.url || res.test_key || "Endpoint"}
                              </span>
                            </div>
                            <p className="text-[11px] text-[var(--color-text-secondary)] mt-0.5">
                              {res.test_key || res.test_case_title || "Direct Run"} ·{" "}
                              {res.assertions?.length || 0} assertions
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 shrink-0">
                          <span
                            className={`font-mono text-xs font-bold ${
                              res.status_code >= 200 && res.status_code < 300
                                ? "text-emerald-600"
                                : res.status_code === 0
                                ? "text-rose-500"
                                : "text-amber-600"
                            }`}
                          >
                            {res.status_code === 0 ? "CONN FAIL" : `HTTP ${res.status_code}`}
                          </span>
                          <span className="flex items-center gap-1 font-mono text-xs text-[var(--color-text-secondary)]">
                            <Clock size={12} />
                            {res.duration_ms}ms
                          </span>
                          <ChevronRight size={15} className="text-[var(--color-text-secondary)]" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </motion.div>
          )}
        </div>
      )}

      {/* TAB 3: EXECUTION HISTORY */}
      {activeTab === "history" && (
        <Card className="p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
            <div>
              <h2 className="font-display text-sm font-semibold text-[var(--color-text-primary)]">
                API Test Execution Runs
              </h2>
              <p className="text-xs text-[var(--color-text-secondary)]">
                Historical record of all standalone test suite executions.
              </p>
            </div>
            <Button variant="secondary" onClick={loadExecutionHistory} loading={loadingHistory} className="text-xs">
              <RefreshCw size={13} />
              <span>Refresh</span>
            </Button>
          </div>

          {loadingHistory ? (
            <Loading />
          ) : runHistory.length === 0 ? (
            <div className="py-12 text-center text-xs text-[var(--color-text-secondary)]">
              No previous runs recorded. Execute tests from the Console or Suite Runner tab.
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
                          setLatestRun(detailed);
                          setActiveTab("suite");
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
