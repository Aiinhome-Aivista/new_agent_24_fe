import React, { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { Zap, Construction, ChevronUp, ChevronDown, Check, Copy, FlaskConical, Play, Sparkles } from "lucide-react";
import { workflowApi } from "@/services/api/workflowApi";
import { testApi } from "@/services/api/testApi";
import { useToast } from "@/contexts/ToastContext";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Loading, ErrorState } from "@/components/ui/Loading";
import { PostmanClient, type PostmanRequestInitial } from "./PostmanClient";
import type { WorkflowRun } from "@/types";

export function ApiEndpointsPage() {
  const [params] = useSearchParams();
  const selectedProject = params.get("project");
  const { notify } = useToast();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [workflowId, setWorkflowId] = useState<string | null>(null);
  const [extractedApis, setExtractedApis] = useState<any[]>([]);
  
  // UI States
  const [expandedApiId, setExpandedApiId] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [apiViewTab, setApiViewTab] = useState<Record<string, "scenarios" | "schema">>({});
  const [selectedScenarioIdx, setSelectedScenarioIdx] = useState<Record<string, number>>({});
  
  // Postman Testing States
  const postmanRef = useRef<HTMLDivElement>(null);
  const [selectedApiIdx, setSelectedApiIdx] = useState<number | null>(null);
  const [postmanInitialReq, setPostmanInitialReq] = useState<PostmanRequestInitial | null>(null);
  
  // Live Testing States
  const [liveEnvUrl, setLiveEnvUrl] = useState("http://localhost:8080");
  const [runningLiveTest, setRunningLiveTest] = useState<Record<string, boolean>>({});
  const [liveTestResults, setLiveTestResults] = useState<Record<string, any>>({});

  useEffect(() => {
    const fetchData = async () => {
      if (!selectedProject) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const wRes = await workflowApi.list();
        const projectWorkflows = (wRes.workflows || []).filter((w: WorkflowRun) => w.project_uuid === selectedProject);
        
        projectWorkflows.sort((a, b) => {
          const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
          const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
          return timeB - timeA;
        });
        
        let foundApis = false;
        // Limit to checking the 5 most recent workflows to avoid excessive API calls
        for (const summaryWf of projectWorkflows.slice(0, 5)) {
          const fullWfRes = await workflowApi.detail(summaryWf.workflow_id);
          const fullWf = fullWfRes.workflow;
          
          if (fullWf && fullWf.state_json && fullWf.state_json.extracted_apis && fullWf.state_json.extracted_apis.length > 0) {
            setWorkflowId(fullWf.workflow_id);
            setExtractedApis(fullWf.state_json.extracted_apis);
            foundApis = true;
            break;
          }
        }
        
        if (!foundApis) {
          setExtractedApis([]);
        }
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [selectedProject]);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleLiveTest = async (scenario: any, idx: number, currScIdx: number | string) => {
    if (!workflowId) return;
    const key = `${idx}-${currScIdx}`;
    setRunningLiveTest(prev => ({ ...prev, [key]: true }));
    try {
      const res = await testApi.runLiveTest(workflowId, scenario, liveEnvUrl);
      if (res && res.result) {
         setLiveTestResults(prev => ({ ...prev, [key]: res.result }));
         notify(res.result.passed ? "success" : "warning", `Live test ${res.result.passed ? 'passed' : 'failed'} (${res.result.status_code}) in ${res.result.duration_ms}ms`);
      }
    } catch (e) {
      notify("error", (e as Error).message);
    } finally {
      setRunningLiveTest(prev => ({ ...prev, [key]: false }));
    }
  };

  const openInPostman = (idx: number, api: any) => {
    setSelectedApiIdx(idx);
    let payloadObj = api.payload_schema || null;
    if (api.test_scenarios && api.test_scenarios.length > 0 && api.test_scenarios[0].actual_payload) {
      payloadObj = api.test_scenarios[0].actual_payload;
    }
    
    setPostmanInitialReq({
      method: api.method || "GET",
      url: api.url || "",
      payload: payloadObj,
      title: api.purpose || api.title || `Test ${api.method} ${api.url}`
    });

    setTimeout(() => {
      postmanRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  if (!selectedProject) {
    return (
      <div className="mx-auto max-w-7xl w-full min-w-0 space-y-6">
        <div className="flex flex-col items-center justify-center py-20 text-center rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)]">
          <Zap size={48} className="text-[var(--color-text-secondary)] mb-4 opacity-50" />
          <h2 className="font-display text-lg font-bold text-[var(--color-text-primary)]">
            No Project Selected
          </h2>
          <p className="text-sm text-[var(--color-text-secondary)] mt-2 max-w-md">
            Please select a project from the sidebar to view its API Endpoints & Schemas.
          </p>
        </div>
      </div>
    );
  }

  if (loading) return <Loading />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="mx-auto max-w-7xl w-full min-w-0 space-y-8 pb-12">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
        <div>
          <h1 className="font-display text-xl font-bold text-[var(--color-text-primary)] flex items-center gap-2">
            <Zap size={20} className="text-cyan-400" />
            <span>API Endpoints & Schemas</span>
          </h1>
          <p className="text-xs text-[var(--color-text-secondary)] mt-1">
            Target endpoints and payload structures identified for this project.
          </p>
        </div>
      </div>

      {extractedApis.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)]">
          <Construction size={48} className="text-[var(--color-text-secondary)] mb-4 opacity-50" />
          <h2 className="font-display text-lg font-bold text-[var(--color-text-primary)]">
            No API Endpoints Found
          </h2>
          <p className="text-sm text-[var(--color-text-secondary)] mt-2 max-w-md">
            We haven't extracted any API endpoints for this project yet. Run a TDD workflow to generate API contracts.
          </p>
        </div>
      ) : (
        <>
          <Card>
            <div className="space-y-3">
              {extractedApis.map((api, idx) => {
                const isExpanded = expandedApiId === `${idx}`;
                return (
                  <div key={idx} className={`rounded-xl border transition-all ${selectedApiIdx === idx ? 'border-purple-500/50 bg-[var(--color-surface-elevated)]/40 shadow-sm shadow-purple-500/10' : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-primary)]/40'}`}>
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
                        <Button
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            openInPostman(idx, api);
                          }}
                          className={`text-xs px-2.5 py-1 h-auto flex items-center gap-1.5 ${selectedApiIdx === idx ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30 hover:bg-purple-500/30 hover:text-purple-200' : 'text-[var(--color-text-secondary)] hover:text-white border border-transparent'}`}
                        >
                          <Play size={12} className={selectedApiIdx === idx ? 'text-purple-400' : ''} />
                          <span>Test in Manual Tester</span>
                        </Button>
                        <div className="w-[1px] h-4 bg-[var(--color-border)]"></div>
                        <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400">
                          Active
                        </span>
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

                        {/* Tab Navigation */}
                        <div className="space-y-3">
                          <div className="flex flex-wrap items-center gap-2 border-b border-[var(--color-border)] pb-2.5">
                            {api.test_scenarios && api.test_scenarios.length > 0 && (
                              <>
                                <span className="text-xs font-semibold text-zinc-400 mr-1 flex items-center gap-1.5">
                                  <FlaskConical size={14} className="text-[var(--color-primary)]" />
                                  Manual Test Scenarios:
                                </span>
                                {api.test_scenarios.map((sc: any, sIdx: number) => {
                                  const defaultTab = api.test_scenarios?.length ? "scenarios" : "schema";
                                  const isCurrentSc = (selectedScenarioIdx[`${idx}`] ?? 0) === sIdx && (apiViewTab[`${idx}`] ?? defaultTab) === "scenarios";
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
                              </>
                            )}
                            <div className={`flex items-center gap-2 ${!api.test_scenarios || api.test_scenarios.length === 0 ? "" : "ml-auto"}`}>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setApiViewTab((prev) => ({ ...prev, [`${idx}`]: "schema" }));
                                }}
                                className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-mono transition-all ${
                                  (apiViewTab[`${idx}`] ?? (api.test_scenarios?.length ? "scenarios" : "schema")) === "schema"
                                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/50"
                                    : "bg-[var(--color-surface)] text-[var(--color-text-secondary)] border border-[var(--color-border)] hover:bg-[var(--color-surface-elevated)]"
                                }`}
                              >
                                <span>📋 JSON Schema</span>
                              </button>
                            </div>
                          </div>

                          {/* SCENARIO VIEW: Actual Payload & Actual Response */}
                          {(apiViewTab[`${idx}`] ?? (api.test_scenarios?.length ? "scenarios" : "schema")) === "scenarios" && api.test_scenarios?.length > 0 && (() => {
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

                                <div className="flex justify-end items-center gap-3 pt-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-mono text-zinc-400">Target URL:</span>
                                    <input 
                                      type="text" 
                                      value={liveEnvUrl} 
                                      onChange={e => setLiveEnvUrl(e.target.value)}
                                      className="bg-[#0d1117] border border-zinc-800 text-xs font-mono text-cyan-300 rounded px-2 py-1 focus:outline-none focus:border-cyan-500 w-48"
                                    />
                                  </div>
                                  <Button
                                    variant="primary"
                                    loading={runningLiveTest[`${idx}-${currScIdx}`]}
                                    onClick={() => handleLiveTest(currSc, idx, currScIdx)}
                                    className="text-xs font-semibold px-4 py-1.5 flex items-center gap-2"
                                  >
                                    <Zap size={14} /> Run Live Test on Git Code
                                  </Button>
                                </div>
                                
                                {liveTestResults[`${idx}-${currScIdx}`] && (
                                   <div className={`mt-2 p-3 rounded-lg border ${liveTestResults[`${idx}-${currScIdx}`].passed ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-rose-500/30 bg-rose-500/10'}`}>
                                      <div className="flex items-center justify-between mb-2">
                                         <span className={`font-mono text-xs font-bold ${liveTestResults[`${idx}-${currScIdx}`].passed ? 'text-emerald-400' : 'text-rose-400'}`}>
                                            Live Execution Result
                                         </span>
                                         <div className="flex gap-2 text-[10px] font-mono">
                                           <span className="bg-[#0d1117] px-1.5 py-0.5 rounded text-zinc-300">
                                              {liveTestResults[`${idx}-${currScIdx}`].status_code} STATUS
                                           </span>
                                           <span className="bg-[#0d1117] px-1.5 py-0.5 rounded text-zinc-300">
                                              {liveTestResults[`${idx}-${currScIdx}`].duration_ms}ms
                                           </span>
                                         </div>
                                      </div>
                                      <pre className={`text-[11px] overflow-x-auto whitespace-pre font-mono ${liveTestResults[`${idx}-${currScIdx}`].passed ? 'text-emerald-300' : 'text-rose-300'}`}>
                                         {liveTestResults[`${idx}-${currScIdx}`].response_body}
                                      </pre>
                                   </div>
                                )}
                              </div>
                            );
                          })()}

                          {/* SCHEMA VIEW: Contract schemas */}
                          {((apiViewTab[`${idx}`] ?? (api.test_scenarios?.length ? "scenarios" : "schema")) === "schema") && (
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
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </Card>

          {/* MANUAL TESTER SECTION (At the bottom, separated) */}
          <div ref={postmanRef} className="pt-8 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-bold text-[var(--color-text-primary)] flex items-center gap-2">
                <span className="text-purple-400">🚀</span>
                <span>Manual Tester</span>
              </h2>
              {selectedApiIdx !== null && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setSelectedApiIdx(null);
                    setPostmanInitialReq(null);
                  }}
                  className="text-xs text-zinc-400 hover:text-white"
                >
                  Clear Selection
                </Button>
              )}
            </div>
            
            <PostmanClient
              workflowId={workflowId}
              initialRequest={postmanInitialReq}
              defaultBaseUrl={liveEnvUrl}
            />
          </div>
        </>
      )}
    </div>
  );
}

