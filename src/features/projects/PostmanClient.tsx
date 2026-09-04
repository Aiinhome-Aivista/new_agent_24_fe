import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Zap,
  Play,
  Copy,
  Check,
  Trash2,
  Plus,
  RefreshCw,
  Code2,
  Download,
  Search,
  Clock,
  HardDrive,
  ShieldCheck,
  Layers,
  Sparkles,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  FileCode,
  FileText,
  History as HistoryIcon,
  XCircle,
  Timer
} from "lucide-react";
import { testApi } from "@/services/api/testApi";
import { useToast } from "@/contexts/ToastContext";
import { Button } from "@/components/ui/Button";

export interface PostmanRequestInitial {
  method?: string;
  url?: string;
  headers?: Record<string, string>;
  params?: Record<string, string>;
  payload?: any;
  title?: string;
}

interface KeyValueItem {
  id: string;
  key: string;
  value: string;
  description?: string;
  enabled: boolean;
}

interface RequestHistoryItem {
  id: string;
  timestamp: string;
  method: string;
  url: string;
  status_code: number;
  status_text: string;
  duration_ms: number;
  size_str: string;
  passed: boolean;
  request_data: any;
  response_body: string;
  response_headers: Record<string, string>;
  response_cookies: any[];
}

interface PostmanClientProps {
  workflowId?: string | null;
  initialRequest?: PostmanRequestInitial | null;
  defaultBaseUrl?: string;
  onUrlChange?: (url: string) => void;
}

const HTTP_METHODS = ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"];
const TIMEOUT_OPTIONS = [
  { label: "No limit (∞)", value: 0 },
  { label: "15s", value: 15 },
  { label: "30s", value: 30 },
  { label: "60s", value: 60 },
  { label: "120s", value: 120 },
  { label: "300s (5m)", value: 300 }
];

export function PostmanClient({
  workflowId,
  initialRequest,
  defaultBaseUrl = "http://localhost:8080",
  onUrlChange
}: PostmanClientProps) {
  const { notify } = useToast();

  // Core Request States
  const [method, setMethod] = useState("GET");
  const [url, setUrl] = useState("");
  const [baseUrl, setBaseUrl] = useState(defaultBaseUrl);
  const [timeoutSec, setTimeoutSec] = useState<number>(0);
  const [activeReqTab, setActiveReqTab] = useState<"params" | "auth" | "headers" | "body">("params");
  
  // Params
  const [queryParams, setQueryParams] = useState<KeyValueItem[]>([
    { id: "1", key: "", value: "", description: "", enabled: true }
  ]);
  const [isParamsBulk, setIsParamsBulk] = useState(false);
  const [paramsBulkText, setParamsBulkText] = useState("");

  // Auth
  const [authType, setAuthType] = useState<"none" | "bearer" | "basic" | "apikey">("none");
  const [bearerToken, setBearerToken] = useState("");
  const [basicUser, setBasicUser] = useState("");
  const [basicPass, setBasicPass] = useState("");
  const [showBasicPass, setShowBasicPass] = useState(false);
  const [apiKeyName, setApiKeyName] = useState("");
  const [apiKeyValue, setApiKeyValue] = useState("");
  const [apiKeyAddTo, setApiKeyAddTo] = useState<"header" | "query">("header");

  // Headers
  const [headers, setHeaders] = useState<KeyValueItem[]>([
    { id: "h1", key: "Content-Type", value: "application/json", description: "Default payload format", enabled: true },
    { id: "h2", key: "Accept", value: "application/json, text/plain, */*", description: "Accepted response formats", enabled: true }
  ]);
  const [isHeadersBulk, setIsHeadersBulk] = useState(false);
  const [headersBulkText, setHeadersBulkText] = useState("");

  // Body
  const [bodyType, setBodyType] = useState<"none" | "json" | "raw" | "form-data" | "urlencoded">("json");
  const [rawBody, setRawBody] = useState("");
  const [formData, setFormData] = useState<KeyValueItem[]>([
    { id: "f1", key: "", value: "", description: "", enabled: true }
  ]);
  const [jsonValidationError, setJsonValidationError] = useState<string | null>(null);

  // Response & Execution States
  const [loading, setLoading] = useState(false);
  const [responseResult, setResponseResult] = useState<any | null>(null);
  const [activeResTab, setActiveResTab] = useState<"body" | "headers" | "cookies" | "history">("body");
  const [responseFormat, setResponseFormat] = useState<"pretty" | "raw">("pretty");
  const [responseSearch, setResponseSearch] = useState("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showCurlModal, setShowCurlModal] = useState(false);

  // History
  const [history, setHistory] = useState<RequestHistoryItem[]>([]);

  // Abort Controller Ref for Cancel
  const abortControllerRef = useRef<AbortController | null>(null);
  const isSyncingRef = useRef(false);

  // Initialize or update when initialRequest changes
  useEffect(() => {
    if (initialRequest) {
      if (initialRequest.method) {
        setMethod(initialRequest.method.toUpperCase());
        if (initialRequest.method.toUpperCase() === "POST" || initialRequest.method.toUpperCase() === "PUT" || initialRequest.method.toUpperCase() === "PATCH") {
          setActiveReqTab("body");
        }
      }
      if (initialRequest.url) {
        setUrl(initialRequest.url);
        syncParamsFromUrl(initialRequest.url);
      }
      if (initialRequest.payload) {
        if (typeof initialRequest.payload === "object") {
          setRawBody(JSON.stringify(initialRequest.payload, null, 2));
          setBodyType("json");
        } else {
          const str = String(initialRequest.payload).trim();
          if ((str.startsWith("{") && str.endsWith("}")) || (str.startsWith("[") && str.endsWith("]"))) {
            try {
              const parsed = JSON.parse(str);
              setRawBody(JSON.stringify(parsed, null, 2));
              setBodyType("json");
            } catch {
              setRawBody(str);
              setBodyType("raw");
            }
          } else {
            setRawBody(str);
            setBodyType("raw");
          }
        }
      }
      if (initialRequest.headers && Object.keys(initialRequest.headers).length > 0) {
        const newHeaders: KeyValueItem[] = Object.entries(initialRequest.headers).map(([k, v], i) => ({
          id: `ih-${i}`,
          key: k,
          value: String(v),
          enabled: true
        }));
        // Ensure Content-Type: application/json exists
        if (!newHeaders.some(h => h.key.toLowerCase() === "content-type")) {
          newHeaders.unshift({ id: "h-ct", key: "Content-Type", value: "application/json", enabled: true });
        }
        setHeaders(newHeaders);
      }
    }
  }, [initialRequest]);

  // Sync Query Params from URL
  const syncParamsFromUrl = (fullUrl: string) => {
    if (isSyncingRef.current) return;
    try {
      const qIndex = fullUrl.indexOf("?");
      if (qIndex === -1) return;
      const queryString = fullUrl.substring(qIndex + 1);
      const searchParams = new URLSearchParams(queryString);
      const items: KeyValueItem[] = [];
      let i = 0;
      searchParams.forEach((value, key) => {
        items.push({
          id: `p-${Date.now()}-${i++}`,
          key,
          value,
          enabled: true
        });
      });
      if (items.length > 0) {
        items.push({ id: `p-${Date.now()}-empty`, key: "", value: "", enabled: true });
        setQueryParams(items);
      }
    } catch {
      // Ignore URL parsing errors while typing
    }
  };

  // Sync URL from Query Params
  const syncUrlFromParams = useCallback((items: KeyValueItem[], currentUrl: string) => {
    isSyncingRef.current = true;
    try {
      const qIndex = currentUrl.indexOf("?");
      const basePart = qIndex !== -1 ? currentUrl.substring(0, qIndex) : currentUrl;
      const validParams = items.filter(item => item.enabled && item.key.trim() !== "");

      if (validParams.length === 0) {
        setUrl(basePart);
        if (onUrlChange) onUrlChange(basePart);
      } else {
        const params = new URLSearchParams();
        validParams.forEach(p => params.append(p.key.trim(), p.value));
        const newUrl = `${basePart}?${params.toString()}`;
        setUrl(newUrl);
        if (onUrlChange) onUrlChange(newUrl);
      }
    } finally {
      setTimeout(() => {
        isSyncingRef.current = false;
      }, 50);
    }
  }, [onUrlChange]);

  // Handle URL change
  const handleUrlInputChange = (val: string) => {
    setUrl(val);
    if (onUrlChange) onUrlChange(val);
    syncParamsFromUrl(val);
  };

  // Params Row Helpers
  const handleParamChange = (index: number, field: keyof KeyValueItem, val: any) => {
    const updated = [...queryParams];
    updated[index] = { ...updated[index], [field]: val };
    if (index === updated.length - 1 && (updated[index].key || updated[index].value)) {
      updated.push({ id: `p-${Date.now()}`, key: "", value: "", enabled: true });
    }
    setQueryParams(updated);
    syncUrlFromParams(updated, url);
  };

  const removeParamRow = (index: number) => {
    if (queryParams.length <= 1) {
      setQueryParams([{ id: `p-${Date.now()}`, key: "", value: "", enabled: true }]);
      syncUrlFromParams([], url);
      return;
    }
    const updated = queryParams.filter((_, i) => i !== index);
    setQueryParams(updated);
    syncUrlFromParams(updated, url);
  };

  // Headers Row Helpers
  const handleHeaderChange = (index: number, field: keyof KeyValueItem, val: any) => {
    const updated = [...headers];
    updated[index] = { ...updated[index], [field]: val };
    if (index === updated.length - 1 && (updated[index].key || updated[index].value)) {
      updated.push({ id: `h-${Date.now()}`, key: "", value: "", enabled: true });
    }
    setHeaders(updated);
  };

  const removeHeaderRow = (index: number) => {
    if (headers.length <= 1) {
      setHeaders([{ id: `h-${Date.now()}`, key: "", value: "", enabled: true }]);
      return;
    }
    setHeaders(headers.filter((_, i) => i !== index));
  };

  // JSON Body Helpers
  const handleJsonChange = (val: string) => {
    setRawBody(val);
    if (!val.trim()) {
      setJsonValidationError(null);
      return;
    }
    try {
      JSON.parse(val);
      setJsonValidationError(null);
    } catch (e: any) {
      setJsonValidationError(e.message);
    }
  };

  const beautifyJson = () => {
    if (!rawBody.trim()) return;
    try {
      const parsed = JSON.parse(rawBody);
      setRawBody(JSON.stringify(parsed, null, 2));
      setJsonValidationError(null);
      notify("success", "JSON formatted cleanly");
    } catch (e: any) {
      notify("error", `Cannot format invalid JSON: ${e.message}`);
    }
  };

  const minifyJson = () => {
    if (!rawBody.trim()) return;
    try {
      const parsed = JSON.parse(rawBody);
      setRawBody(JSON.stringify(parsed));
      setJsonValidationError(null);
    } catch (e: any) {
      notify("error", `Cannot minify invalid JSON: ${e.message}`);
    }
  };

  // Copy helper
  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Generate cURL command
  const generateCurlCommand = () => {
    let resolvedUrl = url.trim();
    if (!resolvedUrl.startsWith("http://") && !resolvedUrl.startsWith("https://")) {
      resolvedUrl = `${baseUrl.replace(/\/$/, "")}/${resolvedUrl.replace(/^\//, "")}`;
    }

    let curl = `curl -X ${method} "${resolvedUrl}" --max-time ${timeoutSec}`;

    // Headers
    headers.filter(h => h.enabled && h.key.trim()).forEach(h => {
      curl += ` \\\n  -H "${h.key.trim()}: ${h.value.trim()}"`;
    });

    if (bodyType === "json" && !headers.some(h => h.enabled && h.key.toLowerCase() === "content-type")) {
      curl += ` \\\n  -H "Content-Type: application/json"`;
    }

    // Auth
    if (authType === "bearer" && bearerToken.trim()) {
      curl += ` \\\n  -H "Authorization: Bearer ${bearerToken.trim()}"`;
    } else if (authType === "basic" && (basicUser || basicPass)) {
      curl += ` \\\n  -u "${basicUser}:${basicPass}"`;
    } else if (authType === "apikey" && apiKeyName.trim() && apiKeyAddTo === "header") {
      curl += ` \\\n  -H "${apiKeyName.trim()}: ${apiKeyValue.trim()}"`;
    }

    // Body
    if (method !== "GET" && method !== "HEAD") {
      if ((bodyType === "json" || bodyType === "raw") && rawBody.trim()) {
        curl += ` \\\n  -d '${rawBody.replace(/'/g, "'\\''")}'`;
      } else if (bodyType === "urlencoded" || bodyType === "form-data") {
        formData.filter(f => f.enabled && f.key.trim()).forEach(f => {
          curl += ` \\\n  -F "${f.key.trim()}=${f.value.trim()}"`;
        });
      }
    }

    return curl;
  };

  // Cancel in-flight request
  const handleCancelRequest = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setLoading(false);
    notify("info", "Request aborted by user");
  };

  // Send / Execute Request
  const handleSendRequest = async () => {
    if (!url.trim()) {
      notify("warning", "Please enter a URL or endpoint path to test");
      return;
    }

    // Build headers dict
    const headersDict: Record<string, string> = {};
    headers.filter(h => h.enabled && h.key.trim()).forEach(h => {
      headersDict[h.key.trim()] = h.value;
    });

    // Auto-ensure Content-Type: application/json for JSON payloads
    if (bodyType === "json" || (bodyType === "raw" && rawBody.trim().startsWith("{"))) {
      if (!Object.keys(headersDict).some(k => k.toLowerCase() === "content-type")) {
        headersDict["Content-Type"] = "application/json";
      }
    }

    // Build params dict
    const paramsDict: Record<string, string> = {};
    queryParams.filter(p => p.enabled && p.key.trim()).forEach(p => {
      paramsDict[p.key.trim()] = p.value;
    });

    // Build auth spec
    const authSpec: any = { type: authType };
    if (authType === "bearer") authSpec.token = bearerToken;
    else if (authType === "basic") {
      authSpec.username = basicUser;
      authSpec.password = basicPass;
    } else if (authType === "apikey") {
      authSpec.key = apiKeyName;
      authSpec.value = apiKeyValue;
      authSpec.add_to = apiKeyAddTo;
    }

    // Parse payload
    let payloadData: any = null;
    if (bodyType === "json") {
      if (rawBody.trim()) {
        try {
          payloadData = JSON.parse(rawBody);
        } catch (e: any) {
          notify("error", `Invalid JSON Body: ${e.message}`);
          return;
        }
      }
    } else if (bodyType === "raw") {
      payloadData = rawBody;
    } else if (bodyType === "form-data" || bodyType === "urlencoded") {
      const fData: Record<string, string> = {};
      formData.filter(f => f.enabled && f.key.trim()).forEach(f => {
        fData[f.key.trim()] = f.value;
      });
      payloadData = fData;
    }

    const scenarioSpec = {
      method,
      url,
      headers: headersDict,
      params: paramsDict,
      auth: authSpec,
      body_type: bodyType,
      payload: payloadData,
      timeout: timeoutSec,
      title: `Manual Postman ${method} Request`
    };

    setLoading(true);
    abortControllerRef.current = new AbortController();

    try {
      const res = await testApi.liveProxy(scenarioSpec, baseUrl);

      if (res && res.result) {
        const result = res.result;
        setResponseResult(result);

        // Add to history
        const histItem: RequestHistoryItem = {
          id: `hist-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          method,
          url,
          status_code: result.status_code || 500,
          status_text: result.status_text || (result.passed ? "OK" : "Error"),
          duration_ms: result.duration_ms || 0,
          size_str: result.size_str || `${result.size_bytes || 0} B`,
          passed: !!result.passed,
          request_data: scenarioSpec,
          response_body: result.response_body || "",
          response_headers: result.response_headers || {},
          response_cookies: result.response_cookies || []
        };
        setHistory(prev => [histItem, ...prev.slice(0, 19)]);

        const isSuccess = result.status_code >= 200 && result.status_code < 300;
        notify(
          isSuccess ? "success" : result.status_code < 500 ? "warning" : "error",
          `Response: ${result.status_code} ${result.status_text || ""} (${result.duration_ms}ms)`
        );
      }
    } catch (e: any) {
      notify("error", `Execution failed: ${e.message || e}`);
      setResponseResult({
        status_code: 500,
        status_text: "Client Error",
        duration_ms: 0,
        size_str: "0 B",
        passed: false,
        response_body: e.message || String(e),
        response_headers: {},
        response_cookies: []
      });
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  };

  // Restore history item
  const restoreHistoryItem = (item: RequestHistoryItem) => {
    setMethod(item.method);
    setUrl(item.url);
    if (item.request_data.payload) {
      if (typeof item.request_data.payload === "object") {
        setRawBody(JSON.stringify(item.request_data.payload, null, 2));
        setBodyType("json");
      } else {
        setRawBody(String(item.request_data.payload));
        setBodyType("raw");
      }
    }
    setResponseResult({
      status_code: item.status_code,
      status_text: item.status_text,
      duration_ms: item.duration_ms,
      size_str: item.size_str,
      passed: item.passed,
      response_body: item.response_body,
      response_headers: item.response_headers,
      response_cookies: item.response_cookies
    });
    notify("info", `Restored request: ${item.method} ${item.url}`);
  };

  // Keyboard shortcut Ctrl/Cmd + Enter to Send
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        handleSendRequest();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [method, url, baseUrl, timeoutSec, headers, queryParams, authType, bearerToken, basicUser, basicPass, apiKeyName, apiKeyValue, apiKeyAddTo, bodyType, rawBody, formData, workflowId]);

  // Method Color Styling
  const getMethodColor = (m: string) => {
    switch (m.toUpperCase()) {
      case "GET": return "text-emerald-400 bg-emerald-500/10 border-emerald-500/30";
      case "POST": return "text-amber-400 bg-amber-500/10 border-amber-500/30";
      case "PUT": return "text-blue-400 bg-blue-500/10 border-blue-500/30";
      case "DELETE": return "text-rose-400 bg-rose-500/10 border-rose-500/30";
      case "PATCH": return "text-purple-400 bg-purple-500/10 border-purple-500/30";
      default: return "text-zinc-400 bg-zinc-500/10 border-zinc-500/30";
    }
  };

  const getStatusColor = (code: number) => {
    if (code >= 200 && code < 300) return "text-emerald-400 bg-emerald-500/15 border-emerald-500/40";
    if (code >= 300 && code < 400) return "text-cyan-400 bg-cyan-500/15 border-cyan-500/40";
    if (code >= 400 && code < 500) return "text-amber-400 bg-amber-500/15 border-amber-500/40";
    return "text-rose-400 bg-rose-500/15 border-rose-500/40";
  };

  // Format Pretty Response Body
  const renderFormattedResponseBody = () => {
    if (!responseResult || !responseResult.response_body) {
      return (
        <div className="p-8 text-center text-zinc-500 font-mono text-xs italic">
          // No response body received
        </div>
      );
    }

    const text = responseResult.response_body;

    if (responseFormat === "raw") {
      return (
        <pre className="p-4 font-mono text-xs text-zinc-200 overflow-x-auto whitespace-pre leading-relaxed select-text">
          {text}
        </pre>
      );
    }

    try {
      const parsed = JSON.parse(text);
      const prettyJson = JSON.stringify(parsed, null, 2);

      if (responseSearch.trim()) {
        const regex = new RegExp(`(${responseSearch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, "gi");
        const parts = prettyJson.split(regex);
        return (
          <pre className="p-4 font-mono text-xs text-cyan-300 overflow-x-auto whitespace-pre leading-relaxed select-text">
            {parts.map((part, i) =>
              regex.test(part) ? (
                <mark key={i} className="bg-amber-500/40 text-amber-200 px-0.5 rounded">
                  {part}
                </mark>
              ) : (
                part
              )
            )}
          </pre>
        );
      }

      return (
        <pre className="p-4 font-mono text-xs text-cyan-300 overflow-x-auto whitespace-pre leading-relaxed select-text">
          {prettyJson}
        </pre>
      );
    } catch {
      return (
        <pre className="p-4 font-mono text-xs text-zinc-300 overflow-x-auto whitespace-pre leading-relaxed select-text">
          {text}
        </pre>
      );
    }
  };

  const isFullUrl = url.trim().startsWith("http://") || url.trim().startsWith("https://");
  const activeHeadersCount = headers.filter(h => h.enabled && h.key.trim()).length;
  const activeParamsCount = queryParams.filter(p => p.enabled && p.key.trim()).length;

  return (
    <div className="flex flex-col border border-zinc-800 rounded-xl bg-[#090b10] overflow-hidden shadow-2xl transition-all">
      {/* Top Header / Omnibar */}
      <div className="p-3.5 border-b border-zinc-800 bg-[#0d1117] flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          {/* Method Selector */}
          <div className="relative shrink-0">
            <select
              value={method}
              onChange={e => setMethod(e.target.value)}
              className={`appearance-none font-mono font-bold text-xs rounded-lg px-3.5 py-2.5 pr-8 border outline-none cursor-pointer focus:ring-1 focus:ring-purple-500 transition-all ${getMethodColor(method)}`}
            >
              {HTTP_METHODS.map(m => (
                <option key={m} value={m} className="bg-[#161b22] text-zinc-200">
                  {m}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400" />
          </div>

          {/* URL Omnibar */}
          <div className="flex-1 flex items-center bg-[#07090e] border border-zinc-700/80 rounded-lg overflow-hidden focus-within:border-purple-500 focus-within:ring-1 focus-within:ring-purple-500 transition-all">
            {!isFullUrl ? (
              <div className="hidden md:flex items-center gap-1.5 px-3 py-2 text-[11px] font-mono text-zinc-400 bg-zinc-900/60 border-r border-zinc-800 shrink-0">
                <span className="text-zinc-500">Env:</span>
                <input
                  type="text"
                  value={baseUrl}
                  onChange={e => setBaseUrl(e.target.value)}
                  title="Target Base URL Environment"
                  className="bg-transparent border-none text-zinc-300 font-mono text-[11px] focus:outline-none w-36 hover:text-white"
                  placeholder="http://localhost:8080"
                />
              </div>
            ) : (
              <div className="hidden md:flex items-center px-2.5 py-1.5 text-[10px] font-mono text-purple-400 bg-purple-500/10 border-r border-zinc-800 shrink-0">
                DIRECT URL
              </div>
            )}

            <input
              type="text"
              value={url}
              onChange={e => handleUrlInputChange(e.target.value)}
              placeholder="Enter URL or endpoint (e.g. /api/users or http://localhost:8080/api/users)"
              className="flex-1 bg-transparent px-3.5 py-2.5 text-xs font-mono text-cyan-300 outline-none w-full placeholder-zinc-600"
            />

            {url && (
              <button
                type="button"
                onClick={() => handleUrlInputChange("")}
                className="px-2.5 text-zinc-500 hover:text-zinc-300 transition-colors"
                title="Clear URL"
              >
                ✕
              </button>
            )}
          </div>

          {/* Timeout Selector */}
          <div className="flex items-center gap-1.5 bg-[#07090e] border border-zinc-700/80 rounded-lg px-2.5 py-2 text-[11px] font-mono text-zinc-400 shrink-0">
            <Timer size={13} className="text-zinc-500" />
            <span className="hidden xl:inline text-zinc-500">Timeout:</span>
            <select
              value={timeoutSec}
              onChange={e => setTimeoutSec(Number(e.target.value))}
              className="bg-transparent text-zinc-200 outline-none cursor-pointer focus:text-white"
            >
              {TIMEOUT_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value} className="bg-[#161b22] text-zinc-200">
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {loading ? (
              <Button
                variant="secondary"
                onClick={handleCancelRequest}
                className="font-semibold text-xs px-4 py-2.5 h-auto flex items-center justify-center gap-1.5 !bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:!bg-rose-500/30"
              >
                <XCircle size={14} className="text-rose-400" />
                <span>Cancel</span>
              </Button>
            ) : (
              <Button
                variant="primary"
                onClick={handleSendRequest}
                className="font-semibold text-xs px-5 py-2.5 h-auto flex items-center justify-center gap-2 !bg-gradient-to-r !from-purple-600 !to-indigo-600 hover:!from-purple-500 hover:!to-indigo-500 text-white border border-purple-400/40 shadow-lg shadow-purple-500/20"
              >
                <Zap size={14} className="text-amber-300" />
                <span>Send</span>
                <span className="hidden lg:inline-block text-[10px] font-mono opacity-60 bg-black/30 px-1 py-0.5 rounded">
                  Ctrl+↵
                </span>
              </Button>
            )}

            <button
              type="button"
              onClick={() => setShowCurlModal(true)}
              className="p-2.5 text-zinc-400 hover:text-zinc-200 bg-zinc-800/80 hover:bg-zinc-750 border border-zinc-700/80 rounded-lg transition-colors"
              title="View & Export as cURL"
            >
              <Code2 size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Split Layout: Left Request Builder / Right Response Viewer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[460px] divide-y lg:divide-y-0 lg:divide-x divide-zinc-800">
        {/* LEFT PANE: Request Builder (7 cols) */}
        <div className="lg:col-span-6 xl:col-span-7 flex flex-col bg-[#0d1117]/60">
          {/* Request Navigation Tabs */}
          <div className="flex items-center px-4 pt-2.5 border-b border-zinc-800 gap-6 text-xs font-medium text-zinc-400 bg-[#0d1117] overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveReqTab("params")}
              className={`pb-2.5 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                activeReqTab === "params" ? "border-purple-500 text-purple-300 font-semibold" : "border-transparent hover:text-zinc-200"
              }`}
            >
              <span>Params</span>
              {activeParamsCount > 0 && (
                <span className="rounded-full bg-purple-500/20 text-purple-300 text-[10px] px-1.5 py-0.2 font-mono">
                  {activeParamsCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveReqTab("auth")}
              className={`pb-2.5 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                activeReqTab === "auth" ? "border-purple-500 text-purple-300 font-semibold" : "border-transparent hover:text-zinc-200"
              }`}
            >
              <span>Authorization</span>
              {authType !== "none" && (
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveReqTab("headers")}
              className={`pb-2.5 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                activeReqTab === "headers" ? "border-purple-500 text-purple-300 font-semibold" : "border-transparent hover:text-zinc-200"
              }`}
            >
              <span>Headers</span>
              <span className="rounded-full bg-zinc-800 text-zinc-300 text-[10px] px-1.5 py-0.2 font-mono">
                {activeHeadersCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveReqTab("body")}
              className={`pb-2.5 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                activeReqTab === "body" ? "border-purple-500 text-purple-300 font-semibold" : "border-transparent hover:text-zinc-200"
              }`}
            >
              <span>Body</span>
              {bodyType !== "none" && (
                <span className="rounded bg-indigo-500/20 text-indigo-300 text-[10px] px-1.5 py-0.2 font-mono uppercase">
                  {bodyType === "json" ? "raw JSON" : bodyType}
                </span>
              )}
            </button>
          </div>

          {/* Request Tab Body */}
          <div className="flex-1 p-4 overflow-y-auto max-h-[500px]">
            {/* PARAMS TAB */}
            {activeReqTab === "params" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
                  <span className="font-semibold text-zinc-300">Query Parameters</span>
                  <button
                    type="button"
                    onClick={() => setIsParamsBulk(!isParamsBulk)}
                    className="text-[11px] text-purple-400 hover:text-purple-300 font-mono"
                  >
                    {isParamsBulk ? "Key-Value Mode" : "Bulk Edit"}
                  </button>
                </div>

                {isParamsBulk ? (
                  <textarea
                    value={paramsBulkText}
                    onChange={e => setParamsBulkText(e.target.value)}
                    placeholder="key:value&#10;key2:value2"
                    className="w-full h-44 bg-[#07090e] border border-zinc-800 rounded-lg p-3 text-xs font-mono text-zinc-200 focus:outline-none focus:border-purple-500"
                  />
                ) : (
                  <div className="border border-zinc-800 rounded-lg overflow-hidden bg-[#07090e]">
                    <div className="grid grid-cols-12 bg-zinc-900/70 border-b border-zinc-800 px-3 py-1.5 text-[11px] font-mono text-zinc-400">
                      <div className="col-span-1"></div>
                      <div className="col-span-5">KEY</div>
                      <div className="col-span-5">VALUE</div>
                      <div className="col-span-1 text-right"></div>
                    </div>
                    <div className="divide-y divide-zinc-800/60">
                      {queryParams.map((p, idx) => (
                        <div key={p.id || idx} className="grid grid-cols-12 items-center px-3 py-1.5 gap-2 hover:bg-zinc-800/20">
                          <div className="col-span-1 flex items-center justify-center">
                            <input
                              type="checkbox"
                              checked={p.enabled}
                              onChange={e => handleParamChange(idx, "enabled", e.target.checked)}
                              className="rounded border-zinc-700 bg-zinc-900 text-purple-600 focus:ring-0 cursor-pointer"
                            />
                          </div>
                          <div className="col-span-5">
                            <input
                              type="text"
                              value={p.key}
                              onChange={e => handleParamChange(idx, "key", e.target.value)}
                              placeholder="Key"
                              className="w-full bg-transparent text-xs font-mono text-zinc-200 placeholder-zinc-600 focus:outline-none"
                            />
                          </div>
                          <div className="col-span-5">
                            <input
                              type="text"
                              value={p.value}
                              onChange={e => handleParamChange(idx, "value", e.target.value)}
                              placeholder="Value"
                              className="w-full bg-transparent text-xs font-mono text-cyan-300 placeholder-zinc-600 focus:outline-none"
                            />
                          </div>
                          <div className="col-span-1 flex justify-end">
                            <button
                              type="button"
                              onClick={() => removeParamRow(idx)}
                              className="text-zinc-600 hover:text-rose-400 transition-colors"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* AUTH TAB */}
            {activeReqTab === "auth" && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-medium text-zinc-400">Type:</span>
                  <select
                    value={authType}
                    onChange={e => setAuthType(e.target.value as any)}
                    className="bg-[#07090e] border border-zinc-700 text-xs font-mono text-zinc-200 rounded-lg px-3 py-1.5 focus:border-purple-500 outline-none"
                  >
                    <option value="none">No Auth</option>
                    <option value="bearer">Bearer Token</option>
                    <option value="basic">Basic Auth</option>
                    <option value="apikey">API Key</option>
                  </select>
                </div>

                {authType === "bearer" && (
                  <div className="space-y-2 p-3 bg-[#07090e] border border-zinc-800 rounded-lg">
                    <label className="text-xs font-mono text-zinc-400">Token:</label>
                    <textarea
                      value={bearerToken}
                      onChange={e => setBearerToken(e.target.value)}
                      placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                      className="w-full h-24 bg-[#0d1117] border border-zinc-750 rounded p-2 text-xs font-mono text-cyan-300 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                )}

                {authType === "basic" && (
                  <div className="space-y-3 p-3 bg-[#07090e] border border-zinc-800 rounded-lg">
                    <div>
                      <label className="text-xs font-mono text-zinc-400 block mb-1">Username:</label>
                      <input
                        type="text"
                        value={basicUser}
                        onChange={e => setBasicUser(e.target.value)}
                        placeholder="admin"
                        className="w-full bg-[#0d1117] border border-zinc-750 rounded px-3 py-1.5 text-xs font-mono text-zinc-200 focus:outline-none focus:border-purple-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-mono text-zinc-400 block mb-1">Password:</label>
                      <div className="relative">
                        <input
                          type={showBasicPass ? "text" : "password"}
                          value={basicPass}
                          onChange={e => setBasicPass(e.target.value)}
                          placeholder="••••••••"
                          className="w-full bg-[#0d1117] border border-zinc-750 rounded px-3 py-1.5 pr-9 text-xs font-mono text-zinc-200 focus:outline-none focus:border-purple-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowBasicPass(!showBasicPass)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                        >
                          {showBasicPass ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {authType === "apikey" && (
                  <div className="space-y-3 p-3 bg-[#07090e] border border-zinc-800 rounded-lg">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-mono text-zinc-400 block mb-1">Key Name:</label>
                        <input
                          type="text"
                          value={apiKeyName}
                          onChange={e => setApiKeyName(e.target.value)}
                          placeholder="X-API-Key"
                          className="w-full bg-[#0d1117] border border-zinc-750 rounded px-3 py-1.5 text-xs font-mono text-zinc-200 focus:outline-none focus:border-purple-500"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-mono text-zinc-400 block mb-1">Add to:</label>
                        <select
                          value={apiKeyAddTo}
                          onChange={e => setApiKeyAddTo(e.target.value as any)}
                          className="w-full bg-[#0d1117] border border-zinc-750 rounded px-3 py-1.5 text-xs font-mono text-zinc-200 focus:outline-none focus:border-purple-500"
                        >
                          <option value="header">Header</option>
                          <option value="query">Query Params</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-mono text-zinc-400 block mb-1">Value:</label>
                      <input
                        type="text"
                        value={apiKeyValue}
                        onChange={e => setApiKeyValue(e.target.value)}
                        placeholder="secret_key_123"
                        className="w-full bg-[#0d1117] border border-zinc-750 rounded px-3 py-1.5 text-xs font-mono text-cyan-300 focus:outline-none focus:border-purple-500"
                      />
                    </div>
                  </div>
                )}

                {authType === "none" && (
                  <div className="p-8 text-center text-zinc-500 text-xs font-mono border border-dashed border-zinc-800 rounded-lg">
                    This request does not use any authorization headers.
                  </div>
                )}
              </div>
            )}

            {/* HEADERS TAB */}
            {activeReqTab === "headers" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
                  <span className="font-semibold text-zinc-300">Headers List</span>
                  <button
                    type="button"
                    onClick={() => setIsHeadersBulk(!isHeadersBulk)}
                    className="text-[11px] text-purple-400 hover:text-purple-300 font-mono"
                  >
                    {isHeadersBulk ? "Key-Value Mode" : "Bulk Edit"}
                  </button>
                </div>

                <div className="border border-zinc-800 rounded-lg overflow-hidden bg-[#07090e]">
                  <div className="grid grid-cols-12 bg-zinc-900/70 border-b border-zinc-800 px-3 py-1.5 text-[11px] font-mono text-zinc-400">
                    <div className="col-span-1"></div>
                    <div className="col-span-5">KEY</div>
                    <div className="col-span-5">VALUE</div>
                    <div className="col-span-1 text-right"></div>
                  </div>
                  <div className="divide-y divide-zinc-800/60">
                    {headers.map((h, idx) => (
                      <div key={h.id || idx} className="grid grid-cols-12 items-center px-3 py-1.5 gap-2 hover:bg-zinc-800/20">
                        <div className="col-span-1 flex items-center justify-center">
                          <input
                            type="checkbox"
                            checked={h.enabled}
                            onChange={e => handleHeaderChange(idx, "enabled", e.target.checked)}
                            className="rounded border-zinc-700 bg-zinc-900 text-purple-600 focus:ring-0 cursor-pointer"
                          />
                        </div>
                        <div className="col-span-5">
                          <input
                            type="text"
                            value={h.key}
                            onChange={e => handleHeaderChange(idx, "key", e.target.value)}
                            placeholder="Header Key"
                            className="w-full bg-transparent text-xs font-mono text-zinc-200 placeholder-zinc-600 focus:outline-none"
                          />
                        </div>
                        <div className="col-span-5">
                          <input
                            type="text"
                            value={h.value}
                            onChange={e => handleHeaderChange(idx, "value", e.target.value)}
                            placeholder="Header Value"
                            className="w-full bg-transparent text-xs font-mono text-cyan-300 placeholder-zinc-600 focus:outline-none"
                          />
                        </div>
                        <div className="col-span-1 flex justify-end">
                          <button
                            type="button"
                            onClick={() => removeHeaderRow(idx)}
                            className="text-zinc-600 hover:text-rose-400 transition-colors"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* BODY TAB */}
            {activeReqTab === "body" && (
              <div className="space-y-3 flex flex-col h-full">
                {/* Body Type Selectors */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-2">
                  <div className="flex items-center gap-4 text-xs">
                    {(["none", "json", "raw", "form-data", "urlencoded"] as const).map(bt => (
                      <label key={bt} className="flex items-center gap-1.5 cursor-pointer text-zinc-300 hover:text-white">
                        <input
                          type="radio"
                          name="bodyType"
                          checked={bodyType === bt}
                          onChange={() => setBodyType(bt)}
                          className="text-purple-600 focus:ring-0"
                        />
                        <span className="font-mono capitalize text-[11px]">{bt === "json" ? "raw JSON" : bt}</span>
                      </label>
                    ))}
                  </div>

                  {bodyType === "json" && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={beautifyJson}
                        className="text-[11px] font-mono text-purple-400 hover:text-purple-300 flex items-center gap-1 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20"
                      >
                        <Sparkles size={11} /> Format JSON
                      </button>
                      <button
                        type="button"
                        onClick={minifyJson}
                        className="text-[11px] font-mono text-zinc-400 hover:text-zinc-200"
                      >
                        Minify
                      </button>
                    </div>
                  )}
                </div>

                {bodyType === "none" && (
                  <div className="p-8 text-center text-zinc-500 text-xs font-mono border border-dashed border-zinc-800 rounded-lg">
                    This request does not have a body.
                  </div>
                )}

                {(bodyType === "json" || bodyType === "raw") && (
                  <div className="flex-1 flex flex-col relative min-h-[220px]">
                    <textarea
                      value={rawBody}
                      onChange={e => handleJsonChange(e.target.value)}
                      placeholder={bodyType === "json" ? "{\n  \"key\": \"value\"\n}" : "Enter raw text payload..."}
                      className="w-full flex-1 min-h-[220px] bg-[#07090e] border border-zinc-800 rounded-lg p-3 text-xs font-mono text-zinc-200 focus:outline-none focus:border-purple-500 resize-y leading-relaxed"
                      spellCheck={false}
                    />
                    {jsonValidationError && (
                      <div className="mt-1 text-[11px] font-mono text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 rounded flex items-center gap-1.5">
                        <span>⚠️</span> {jsonValidationError}
                      </div>
                    )}
                  </div>
                )}

                {(bodyType === "form-data" || bodyType === "urlencoded") && (
                  <div className="border border-zinc-800 rounded-lg overflow-hidden bg-[#07090e]">
                    <div className="grid grid-cols-12 bg-zinc-900/70 border-b border-zinc-800 px-3 py-1.5 text-[11px] font-mono text-zinc-400">
                      <div className="col-span-1"></div>
                      <div className="col-span-5">KEY</div>
                      <div className="col-span-5">VALUE</div>
                      <div className="col-span-1 text-right"></div>
                    </div>
                    <div className="divide-y divide-zinc-800/60">
                      {formData.map((f, idx) => (
                        <div key={f.id || idx} className="grid grid-cols-12 items-center px-3 py-1.5 gap-2 hover:bg-zinc-800/20">
                          <div className="col-span-1 flex items-center justify-center">
                            <input
                              type="checkbox"
                              checked={f.enabled}
                              onChange={e => {
                                const updated = [...formData];
                                updated[idx] = { ...updated[idx], enabled: e.target.checked };
                                setFormData(updated);
                              }}
                              className="rounded border-zinc-700 bg-zinc-900 text-purple-600 focus:ring-0 cursor-pointer"
                            />
                          </div>
                          <div className="col-span-5">
                            <input
                              type="text"
                              value={f.key}
                              onChange={e => {
                                const updated = [...formData];
                                updated[idx] = { ...updated[idx], key: e.target.value };
                                if (idx === updated.length - 1 && updated[idx].key) {
                                  updated.push({ id: `f-${Date.now()}`, key: "", value: "", enabled: true });
                                }
                                setFormData(updated);
                              }}
                              placeholder="Key"
                              className="w-full bg-transparent text-xs font-mono text-zinc-200 placeholder-zinc-600 focus:outline-none"
                            />
                          </div>
                          <div className="col-span-5">
                            <input
                              type="text"
                              value={f.value}
                              onChange={e => {
                                const updated = [...formData];
                                updated[idx] = { ...updated[idx], value: e.target.value };
                                setFormData(updated);
                              }}
                              placeholder="Value"
                              className="w-full bg-transparent text-xs font-mono text-cyan-300 placeholder-zinc-600 focus:outline-none"
                            />
                          </div>
                          <div className="col-span-1 flex justify-end">
                            <button
                              type="button"
                              onClick={() => {
                                if (formData.length <= 1) {
                                  setFormData([{ id: `f-${Date.now()}`, key: "", value: "", enabled: true }]);
                                } else {
                                  setFormData(formData.filter((_, i) => i !== idx));
                                }
                              }}
                              className="text-zinc-600 hover:text-rose-400 transition-colors"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANE: Response Viewer (5 cols) */}
        <div className="lg:col-span-6 xl:col-span-5 flex flex-col bg-[#07090e]">
          {/* Response Header Status Bar */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800 bg-[#0d1117]/80">
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-bold text-zinc-200">Response</span>
              {responseResult && (
                <div className="flex items-center gap-2">
                  <span
                    className={`font-mono text-[11px] font-bold px-2 py-0.5 rounded border ${getStatusColor(
                      responseResult.status_code
                    )}`}
                  >
                    {responseResult.status_code} {responseResult.status_text || ""}
                  </span>
                  <span className="text-[11px] font-mono text-cyan-400 flex items-center gap-1">
                    <Clock size={11} /> {responseResult.duration_ms} ms
                  </span>
                  <span className="text-[11px] font-mono text-purple-400 flex items-center gap-1">
                    <HardDrive size={11} /> {responseResult.size_str || "0 B"}
                  </span>
                </div>
              )}
            </div>

            {responseResult && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleCopy(responseResult.response_body || "", "resp-body")}
                  className="p-1.5 text-zinc-400 hover:text-white rounded hover:bg-zinc-800 transition-colors"
                  title="Copy Response Body"
                >
                  {copiedKey === "resp-body" ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const blob = new Blob([responseResult.response_body || ""], { type: "application/json" });
                    const dlUrl = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = dlUrl;
                    a.download = `response-${Date.now()}.json`;
                    a.click();
                  }}
                  className="p-1.5 text-zinc-400 hover:text-white rounded hover:bg-zinc-800 transition-colors"
                  title="Download Response"
                >
                  <Download size={13} />
                </button>
              </div>
            )}
          </div>

          {/* Response Subtabs */}
          <div className="flex items-center justify-between px-4 py-1.5 border-b border-zinc-800 bg-[#07090e] text-xs">
            <div className="flex items-center gap-4 text-zinc-400 font-medium">
              <button
                type="button"
                onClick={() => setActiveResTab("body")}
                className={`transition-colors py-1 ${
                  activeResTab === "body" ? "text-purple-400 font-semibold border-b-2 border-purple-500" : "hover:text-zinc-200"
                }`}
              >
                Body
              </button>
              <button
                type="button"
                onClick={() => setActiveResTab("headers")}
                className={`transition-colors py-1 flex items-center gap-1 ${
                  activeResTab === "headers" ? "text-purple-400 font-semibold border-b-2 border-purple-500" : "hover:text-zinc-200"
                }`}
              >
                <span>Headers</span>
                {responseResult?.response_headers && (
                  <span className="text-[10px] text-zinc-500">
                    ({Object.keys(responseResult.response_headers).length})
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setActiveResTab("cookies")}
                className={`transition-colors py-1 flex items-center gap-1 ${
                  activeResTab === "cookies" ? "text-purple-400 font-semibold border-b-2 border-purple-500" : "hover:text-zinc-200"
                }`}
              >
                <span>Cookies</span>
                {responseResult?.response_cookies && (
                  <span className="text-[10px] text-zinc-500">
                    ({responseResult.response_cookies.length})
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setActiveResTab("history")}
                className={`transition-colors py-1 flex items-center gap-1 ${
                  activeResTab === "history" ? "text-purple-400 font-semibold border-b-2 border-purple-500" : "hover:text-zinc-200"
                }`}
              >
                <HistoryIcon size={12} />
                <span>History</span>
                {history.length > 0 && (
                  <span className="text-[10px] text-zinc-500">({history.length})</span>
                )}
              </button>
            </div>

            {activeResTab === "body" && responseResult && (
              <div className="flex items-center gap-2">
                <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded px-1.5 py-0.5 text-[10px] font-mono">
                  <Search size={10} className="text-zinc-500 mr-1" />
                  <input
                    type="text"
                    value={responseSearch}
                    onChange={e => setResponseSearch(e.target.value)}
                    placeholder="Search body..."
                    className="bg-transparent text-zinc-200 outline-none w-20 placeholder-zinc-600"
                  />
                </div>
                <div className="flex rounded bg-zinc-900 p-0.5 text-[10px] font-mono">
                  <button
                    type="button"
                    onClick={() => setResponseFormat("pretty")}
                    className={`px-1.5 py-0.5 rounded ${
                      responseFormat === "pretty" ? "bg-purple-600 text-white" : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    Pretty
                  </button>
                  <button
                    type="button"
                    onClick={() => setResponseFormat("raw")}
                    className={`px-1.5 py-0.5 rounded ${
                      responseFormat === "raw" ? "bg-purple-600 text-white" : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    Raw
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Response Content View */}
          <div className="flex-1 overflow-auto max-h-[500px]">
            {activeResTab === "body" && (
              <>
                {responseResult ? (
                  renderFormattedResponseBody()
                ) : (
                  <div className="h-full min-h-[300px] flex flex-col items-center justify-center p-8 text-center text-zinc-600 gap-3">
                    <div className="p-3.5 rounded-full bg-zinc-900/80 border border-zinc-800 text-zinc-500">
                      <Zap size={24} />
                    </div>
                    <div>
                      <h4 className="text-zinc-400 font-medium text-sm">Hit Send to get a response</h4>
                      <p className="text-zinc-600 text-xs mt-1 max-w-xs">
                        Configure method, URL, parameters or payload and click Send to execute live request.
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}

            {activeResTab === "headers" && (
              <div className="p-3">
                {responseResult?.response_headers && Object.keys(responseResult.response_headers).length > 0 ? (
                  <div className="border border-zinc-800 rounded-lg overflow-hidden font-mono text-xs">
                    <div className="grid grid-cols-12 bg-zinc-900/70 border-b border-zinc-800 px-3 py-1.5 text-[11px] text-zinc-400 font-semibold">
                      <div className="col-span-5">KEY</div>
                      <div className="col-span-7">VALUE</div>
                    </div>
                    <div className="divide-y divide-zinc-800/60 bg-[#07090e]">
                      {Object.entries(responseResult.response_headers).map(([k, v], i) => (
                        <div key={i} className="grid grid-cols-12 px-3 py-1.5 gap-2 hover:bg-zinc-800/20">
                          <div className="col-span-5 text-zinc-400 font-semibold break-all">{k}</div>
                          <div className="col-span-7 text-cyan-300 break-all">{String(v)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center text-zinc-500 font-mono text-xs italic">
                    // No response headers recorded yet
                  </div>
                )}
              </div>
            )}

            {activeResTab === "cookies" && (
              <div className="p-3">
                {responseResult?.response_cookies && responseResult.response_cookies.length > 0 ? (
                  <div className="border border-zinc-800 rounded-lg overflow-hidden font-mono text-xs">
                    <div className="grid grid-cols-12 bg-zinc-900/70 border-b border-zinc-800 px-3 py-1.5 text-[11px] text-zinc-400 font-semibold">
                      <div className="col-span-4">NAME</div>
                      <div className="col-span-4">VALUE</div>
                      <div className="col-span-4">DOMAIN / PATH</div>
                    </div>
                    <div className="divide-y divide-zinc-800/60 bg-[#07090e]">
                      {responseResult.response_cookies.map((c: any, i: number) => (
                        <div key={i} className="grid grid-cols-12 px-3 py-1.5 gap-2 hover:bg-zinc-800/20">
                          <div className="col-span-4 text-emerald-400 font-semibold">{c.name}</div>
                          <div className="col-span-4 text-cyan-300 break-all">{c.value}</div>
                          <div className="col-span-4 text-zinc-500">{c.domain || "/"} {c.path}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center text-zinc-500 font-mono text-xs italic">
                    // No cookies set in this response
                  </div>
                )}
              </div>
            )}

            {activeResTab === "history" && (
              <div className="p-3 space-y-2">
                {history.length === 0 ? (
                  <div className="p-8 text-center text-zinc-500 font-mono text-xs italic">
                    // No execution history in this session yet
                  </div>
                ) : (
                  history.map((h, i) => (
                    <div
                      key={h.id || i}
                      onClick={() => restoreHistoryItem(h)}
                      className="p-2.5 rounded-lg border border-zinc-800 bg-[#0d1117] hover:border-purple-500/50 hover:bg-zinc-800/30 cursor-pointer flex items-center justify-between gap-2 transition-all"
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <span className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded border ${getMethodColor(h.method)}`}>
                          {h.method}
                        </span>
                        <span className="font-mono text-xs text-zinc-300 truncate max-w-[180px]">
                          {h.url}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 text-[10px] font-mono">
                        <span className={`px-1.5 py-0.5 rounded border ${getStatusColor(h.status_code)}`}>
                          {h.status_code}
                        </span>
                        <span className="text-zinc-500">{h.duration_ms}ms</span>
                        <span className="text-zinc-600">{h.timestamp}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* cURL / Code Generator Modal */}
      {showCurlModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#0e1218] border border-zinc-700 rounded-xl max-w-2xl w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="font-display text-sm font-bold text-zinc-100 flex items-center gap-2">
                <Code2 size={16} className="text-purple-400" />
                <span>Generated cURL Command</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowCurlModal(false)}
                className="text-zinc-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="relative bg-[#07090e] border border-zinc-800 rounded-lg p-3">
              <pre className="text-xs font-mono text-cyan-300 whitespace-pre-wrap break-all leading-relaxed max-h-60 overflow-y-auto">
                {generateCurlCommand()}
              </pre>
              <button
                type="button"
                onClick={() => handleCopy(generateCurlCommand(), "curl-cmd")}
                className="absolute right-3 top-3 px-2.5 py-1 rounded bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 text-xs font-mono flex items-center gap-1.5 border border-purple-500/30 transition-colors"
              >
                {copiedKey === "curl-cmd" ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                <span>{copiedKey === "curl-cmd" ? "Copied" : "Copy cURL"}</span>
              </button>
            </div>

            <div className="flex justify-end">
              <Button variant="secondary" onClick={() => setShowCurlModal(false)} className="text-xs">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
