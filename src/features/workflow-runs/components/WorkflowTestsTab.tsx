import React from "react";
import { Card } from "@/components/ui/Card";
import { OriginBadge } from "@/components/ui/OriginBadge";
import type {
  TestCase,
  WorkflowRun,
  CodeLog,
  CoverageMatrixItem,
  GenerationSummary,
  ContractGap,
} from "@/types";
import {
  Zap,
  FlaskConical,
  ChevronDown,
  ChevronUp,
  Check,
  Copy,
  Layers,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  AlertTriangle,
  Terminal,
  FileCode,
  Code2,
} from "lucide-react";

interface WorkflowTestsTabProps {
  extractedApis: any[];
  expandedApiId: string | null;
  onToggleExpandApi: (id: string | null) => void;
  selectedScenarioIdx: Record<string, number>;
  onSelectScenario: (apiIdx: string, scenarioIdx: number) => void;
  apiViewTab: Record<string, "scenarios" | "schema">;
  onSelectApiViewTab: (apiIdx: string, tab: "scenarios" | "schema") => void;
  showTestCases: boolean;
  onToggleShowTestCases: () => void;
  tests: TestCase[];
  expandedTestUuid: string | null;
  onToggleExpandTest: (uuid: string | null) => void;
  generationSummary: GenerationSummary | null;
  coverageMatrix: CoverageMatrixItem[];
  showCoverageMatrix: boolean;
  onToggleShowCoverageMatrix: () => void;
  contractGaps: ContractGap[];
  codeLogData: CodeLog | null;
  showCodeLog: boolean;
  onToggleShowCodeLog: () => void;
  onTestStatusChange: (uuid: string, status: string) => Promise<void>;
  onCopy: (text: string, key: string) => void;
  copiedKey: string | null;
  workflowDetail: WorkflowRun | null;
}

export function WorkflowTestsTab({
  extractedApis,
  expandedApiId,
  onToggleExpandApi,
  selectedScenarioIdx,
  onSelectScenario,
  apiViewTab,
  onSelectApiViewTab,
  showTestCases,
  onToggleShowTestCases,
  tests,
  expandedTestUuid,
  onToggleExpandTest,
  generationSummary,
  coverageMatrix,
  showCoverageMatrix,
  onToggleShowCoverageMatrix,
  contractGaps,
  codeLogData,
  showCodeLog,
  onToggleShowCodeLog,
  onTestStatusChange,
  onCopy,
  copiedKey,
  workflowDetail,
}: WorkflowTestsTabProps) {
  return (
    <div className="space-y-6">
      {/* API Endpoints & Schemas */}
      {extractedApis.length > 0 && (
        <Card>
          <div className="mb-4">
            <h2 className="font-display text-base font-bold text-[var(--color-text-primary)] flex items-center gap-2">
              <Zap size={18} className="text-cyan-400" />
              <span>API Endpoints &amp; Schemas</span>
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
                    onClick={() => onToggleExpandApi(isExpanded ? null : `${idx}`)}
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
                            {api.test_scenarios.map((sc: any, sIdx: number) => {
                              const isCurrentSc = (selectedScenarioIdx[`${idx}`] ?? 0) === sIdx && (apiViewTab[`${idx}`] ?? "scenarios") === "scenarios";
                              const is2xx = sc.status_code >= 200 && sc.status_code < 300;
                              const is4xx = sc.status_code >= 400 && sc.status_code < 500;
                              return (
                                <button
                                  key={sIdx}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onSelectScenario(`${idx}`, sIdx);
                                    onSelectApiViewTab(`${idx}`, "scenarios");
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
                                onSelectApiViewTab(`${idx}`, "schema");
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
                                            onClick={() => onCopy(payloadStr, `req-${idx}-${currScIdx}`)}
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
                                            onClick={() => onCopy(responseStr, `res-${idx}-${currScIdx}`)}
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
              );
            })}
          </div>
        </Card>
      )}

      {/* Generated Test Cases */}
      <Card>
        <div
          className="mb-4 flex items-center justify-between cursor-pointer select-none hover:bg-white/[0.02] p-2 -m-2 rounded-lg transition-colors"
          onClick={onToggleShowTestCases}
        >
          <div>
            <h2 className="font-display text-base font-bold text-[var(--color-text-primary)] flex items-center gap-2">
              <FlaskConical size={18} className="text-[var(--color-primary)]" />
              <span>Generated Test Cases &amp; Responsible Functions</span>
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
                  onClick={onToggleShowCoverageMatrix}
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
                                      if (targetTest) onToggleExpandTest(targetTest.uuid);
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
                      API Contract Gap &amp; Source Grounding Notice
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
                  onClick={onToggleShowCodeLog}
                  className="flex items-center justify-between p-3.5 bg-[#161b22] border-b border-[var(--color-border)] cursor-pointer select-none hover:bg-[#1f242c] transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <Terminal size={16} className="text-emerald-400" />
                    <span className="text-xs font-bold text-white tracking-wide">
                      Code Generation &amp; Workspace Write Log
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

                  return (
                    <div
                      key={t.uuid}
                      className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden transition-all hover:border-[var(--color-border-orange)]"
                    >
                      {/* Accordion Header */}
                      <div
                        onClick={() => onToggleExpandTest(isExpanded ? null : t.uuid)}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 cursor-pointer hover:bg-[var(--color-surface-elevated)]/40 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="font-mono text-xs font-bold text-[var(--color-primary)] shrink-0">
                            {t.test_key || `TEST-${t.uuid.slice(0, 6)}`}
                          </span>

                          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide shrink-0 ${scenarioTypeBadgeColor}`}>
                            {t.scenario_type || "functional"}
                          </span>

                          <h3 className="font-medium text-xs text-[var(--color-text-primary)] truncate">
                            {t.title}
                          </h3>

                          {requiresReview && (
                            <span className="hidden sm:inline-flex items-center gap-1 rounded bg-amber-500/20 border border-amber-500/30 px-1.5 py-0.5 text-[9px] font-bold text-amber-300">
                              <AlertTriangle size={10} /> AI Assumption
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-auto">
                          {t.origin && <OriginBadge origin={t.origin} />}
                          <div className="relative inline-flex items-center">
                            <select
                              value={t.status}
                              onChange={(e) => {
                                e.stopPropagation();
                                onTestStatusChange(t.uuid, e.target.value);
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className={`appearance-none rounded-full pl-5 pr-6 py-1 text-xs font-semibold cursor-pointer border transition-all focus:outline-none focus:ring-1 ${
                                t.status === "APPROVED"
                                  ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25 focus:ring-emerald-500"
                                  : t.status === "REJECTED"
                                  ? "bg-rose-500/15 text-rose-400 border-rose-500/30 hover:bg-rose-500/25 focus:ring-rose-500"
                                  : t.status === "DRAFT"
                                  ? "bg-zinc-800/80 text-zinc-400 border-zinc-700 hover:bg-zinc-800 focus:ring-zinc-500"
                                  : "bg-blue-500/15 text-blue-400 border-blue-500/30 hover:bg-blue-500/25 focus:ring-blue-500"
                              }`}
                            >
                              <option value="AWAITING_REVIEW" className="bg-[#161b22] text-blue-400">AWAITING REVIEW</option>
                              <option value="APPROVED" className="bg-[#161b22] text-emerald-400">APPROVED</option>
                              <option value="REJECTED" className="bg-[#161b22] text-rose-400">REJECTED</option>
                              <option value="DRAFT" className="bg-[#161b22] text-zinc-400">DRAFT</option>
                            </select>
                            <span
                              className={`pointer-events-none absolute left-2.5 h-1.5 w-1.5 rounded-full ${
                                t.status === "APPROVED"
                                  ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]"
                                  : t.status === "REJECTED"
                                  ? "bg-rose-400 shadow-[0_0_6px_rgba(244,63,94,0.8)]"
                                  : t.status === "DRAFT"
                                  ? "bg-zinc-400"
                                  : "bg-blue-400 shadow-[0_0_6px_rgba(96,165,250,0.8)]"
                              }`}
                            />
                            <ChevronDown
                              size={12}
                              className={`pointer-events-none absolute right-2 ${
                                t.status === "APPROVED"
                                  ? "text-emerald-400"
                                  : t.status === "REJECTED"
                                  ? "text-rose-400"
                                  : t.status === "DRAFT"
                                  ? "text-zinc-400"
                                  : "text-blue-400"
                              }`}
                            />
                          </div>

                          <button type="button" className="text-[var(--color-text-secondary)] hover:text-white ml-1">
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                        </div>
                      </div>

                      {/* Accordion Body */}
                      {isExpanded && (
                        <div className="border-t border-[var(--color-border)] bg-[var(--color-surface-elevated)]/20 p-4 space-y-4">
                          {/* Test Intent / Description */}
                          {t.description && (
                            <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed bg-[var(--color-surface)] p-3 rounded-lg border border-[var(--color-border)]">
                              {t.description}
                            </p>
                          )}

                          {/* Preconditions */}
                          {preconditions.length > 0 && (
                            <div className="space-y-1">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
                                Preconditions:
                              </span>
                              <ul className="list-disc pl-5 text-xs text-[var(--color-text-secondary)] space-y-0.5">
                                {preconditions.map((p: string, pIdx: number) => (
                                  <li key={pIdx}>{p}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Test Steps */}
                          {testSteps.length > 0 && (
                            <div className="space-y-1">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
                                Execution Steps:
                              </span>
                              <ol className="list-decimal pl-5 text-xs text-[var(--color-text-secondary)] space-y-0.5">
                                {testSteps.map((s: string, sIdx: number) => (
                                  <li key={sIdx}>{s}</li>
                                ))}
                              </ol>
                            </div>
                          )}

                          {/* Responsible Functions Mapping */}
                          {respFuncs.length > 0 && (
                            <div className="space-y-1.5">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
                                Target Codebase Function(s):
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {respFuncs.map((fn: string, fIdx: number) => (
                                  <span
                                    key={fIdx}
                                    className="rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] px-2.5 py-1 font-mono text-[11px] text-[var(--color-primary)] shadow-sm"
                                  >
                                    {fn}()
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Dual-Column Contract & Schema Specification Grid */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* 1. Request Specification */}
                            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5 space-y-2.5">
                              <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-2">
                                <span className="font-bold text-xs text-[var(--color-text-primary)] flex items-center gap-1.5">
                                  <Zap size={14} className="text-cyan-400" />
                                  Request Contract
                                </span>
                                <span className={`rounded px-2 py-0.5 font-mono text-[10px] font-bold ${
                                  reqMethod === "GET" ? "bg-blue-500/20 text-blue-300" :
                                  reqMethod === "POST" ? "bg-emerald-500/20 text-emerald-300" :
                                  reqMethod === "PUT" ? "bg-amber-500/20 text-amber-300" : "bg-red-500/20 text-red-300"
                                }`}>
                                  {reqMethod}
                                </span>
                              </div>

                              <div className="space-y-1">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
                                  Endpoint URI:
                                </span>
                                <div className="rounded-lg bg-[#0d1117] p-2 font-mono text-xs text-cyan-300 border border-white/5 break-all select-all">
                                  {reqEndpoint || "/api/v1/resource"}
                                </div>
                              </div>

                              {Object.keys(reqHeaders).length > 0 && (
                                <div className="space-y-1">
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
                                    Headers:
                                  </span>
                                  <div className="rounded-lg bg-[var(--color-surface-elevated)] p-2 font-mono text-[10px] text-[var(--color-text-secondary)] space-y-0.5">
                                    {Object.entries(reqHeaders).map(([hk, hv], hIdx) => (
                                      <div key={hIdx}>
                                        <strong className="text-[var(--color-text-primary)]">{hk}:</strong> {hv}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {reqBody ? (
                                <div className="space-y-1">
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">
                                    Request Body:
                                  </span>
                                  <pre className="rounded-lg bg-[#0d1117] p-2.5 text-[11px] font-mono text-emerald-300 overflow-x-auto max-h-36 border border-white/5">
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
                                  Expected Response &amp; Assertions
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
                                    {expAssertions.map((ast: string, aIdx: number) => (
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

                          {/* Generated Code Display */}
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
                                    onCopy(t.generated_code || "", t.test_key);
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
  );
}
