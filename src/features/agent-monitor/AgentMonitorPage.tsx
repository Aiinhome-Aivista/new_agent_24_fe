import { useState } from "react";
import { useAsync } from "@/hooks/useAsync";
import { agentApi } from "@/services/api/agentApi";
import { AgentCard } from "@/components/agents/AgentCard";
import { Loading, ErrorState } from "@/components/ui/Loading";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  Cpu,
  ShieldCheck,
  Zap,
  Activity,
  Layers,
  RefreshCw,
  Clock,
  Workflow,
  TableProperties,
} from "lucide-react";
import type { AgentInfo } from "@/types";

interface AgentSpec {
  agent: string;
  name: string;
  role: string;
  tier: string;
  tool: string;
  deliverable: string;
  category: "reasoning" | "code" | "tools" | "governance";
}

const AGENT_SPECS: AgentSpec[] = [
  {
    agent: "Orchestrator",
    name: "orchestrator",
    role: "State Machine Governor & Human Checkpoint Coordinator",
    tier: "Workflow Engine",
    tool: "State Machine Engine",
    deliverable: "Linear Pipeline State & Gate Transitions",
    category: "governance",
  },
  {
    agent: "RequirementAnalyzerAgent",
    name: "requirement_analyzer",
    role: "AC Scenario Decomposition & Ambiguity Detection",
    tier: "LLM Reasoning",
    tool: "Gemini 3.1 Flash-Lite",
    deliverable: "Decomposed Scenarios & Acceptance Criteria",
    category: "reasoning",
  },
  {
    agent: "ServicePlannerAgent",
    name: "service_planner",
    role: "API Contract & Service Dependency Synthesis",
    tier: "LLM Reasoning",
    tool: "Gemini 3.1 Flash-Lite",
    deliverable: "OpenAPI Specifications & Payload Schemas",
    category: "reasoning",
  },
  {
    agent: "ReviewAgent",
    name: "review_agent",
    role: "Contract Gap & Missing Function Audit",
    tier: "LLM Reasoning",
    tool: "Gemini 3.1 Flash-Lite",
    deliverable: "Contract Discrepancy & Consistency Audit",
    category: "reasoning",
  },
  {
    agent: "TestGeneratorAgent",
    name: "test_generator",
    role: "Traceable TDD Test Formulation & Function Mapping",
    tier: "LLM Code",
    tool: "Gemini 3.1 Flash-Lite",
    deliverable: "TDD Test Plan Matrix & Assertion Rules",
    category: "code",
  },
  {
    agent: "CodeGeneratorAgent",
    name: "code_generator",
    role: "Compilable Test Code Synthesis (JUnit5 / PyTest)",
    tier: "LLM Code",
    tool: "Gemini 3.1 Flash-Lite",
    deliverable: "Executable Test Code & Postman Collection",
    category: "code",
  },
  {
    agent: "ApiExecutorAgent",
    name: "api_executor",
    role: "Deterministic HTTP & Postman Collection Runner",
    tier: "Tool Adapter",
    tool: "HttpRunner / Newman",
    deliverable: "Real-Time HTTP Transcripts & Status Diffs",
    category: "tools",
  },
  {
    agent: "CodeValidatorAgent",
    name: "code_validator",
    role: "Static Quality & Security Rule Analysis",
    tier: "Tool Adapter",
    tool: "SonarQube / Checkstyle",
    deliverable: "Static Quality Report & Remediation Patches",
    category: "tools",
  },
  {
    agent: "EvidenceGeneratorAgent",
    name: "evidence_generator",
    role: "Audit Report Compilation & SHA-256 Checksum",
    tier: "Doc Engine",
    tool: "Markdown / HTML / SHA-256",
    deliverable: "Cryptographically Signed Audit Dossier",
    category: "governance",
  },
  {
    agent: "AlmAgent",
    name: "alm_agent",
    role: "Idempotent External ALM Sync (Jira / Azure DevOps)",
    tier: "ALM Adapter",
    tool: "Jira / Azure DevOps API",
    deliverable: "Synced Enterprise Work Items & Test Links",
    category: "governance",
  },
];

export function AgentMonitorPage() {
  const [filterCategory, setFilterCategory] = useState<"all" | "reasoning" | "code" | "tools" | "governance">("all");
  const [activeTab, setActiveTab] = useState<"swarm" | "pipeline" | "capabilities" | "activity">("swarm");

  const { data, loading, error, reload } = useAsync(async () => {
    const [agentsRes, activityRes] = await Promise.all([
      agentApi.list(),
      agentApi.activity().catch(() => ({ activity: [] })),
    ]);
    return {
      agents: (agentsRes as any).agents || [],
      totalAgents: (agentsRes as any).total_agents || (agentsRes as any).agents?.length || 10,
      totalExecutions: (agentsRes as any).total_executions || 0,
      avgLatencyMs: (agentsRes as any).avg_latency_ms || 0,
      activity: ((activityRes as any).activity as any[]) || [],
    };
  }, []);

  if (loading) return <Loading />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  const agentsList: AgentInfo[] = data?.agents ?? [];
  const activityList = data?.activity ?? [];

  const filteredAgents = agentsList.filter((a) => {
    if (filterCategory === "all") return true;
    const target = AGENT_SPECS.find((t) => t.name === a.name);
    return target?.category === filterCategory;
  });

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between border-b border-[var(--color-border)] pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-display text-2xl font-bold text-[var(--color-text-primary)] flex items-center gap-2.5">
              <Cpu className="text-[var(--color-primary)]" size={24} />
              <span>Agent Swarm Observability</span>
            </h1>
            <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 border border-emerald-500/20">
              10 Swarm Nodes Active
            </span>
          </div>
          <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
            Real-time operational health, lifecycle orchestration, and execution telemetry across the central orchestrator and specialist swarm.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={reload} className="text-xs py-1.5 px-3">
            <RefreshCw size={13} />
            <span>Refresh Telemetry</span>
          </Button>
        </div>
      </div>

      {/* Observability KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4 space-y-1 bg-gradient-to-br from-[var(--color-surface)] to-[var(--color-surface-elevated)]/30">
          <div className="flex items-center justify-between text-xs text-[var(--color-text-secondary)]">
            <span className="font-semibold">Registered Swarm</span>
            <Layers size={15} className="text-[var(--color-primary)]" />
          </div>
          <div className="text-2xl font-bold font-mono text-[var(--color-text-primary)]">
            {agentsList.length || 10} Agents
          </div>
          <div className="text-[11px] text-[var(--color-text-secondary)]">
            1 Conductor Orchestrator + 9 Specialists
          </div>
        </Card>

        <Card className="p-4 space-y-1 bg-gradient-to-br from-[var(--color-surface)] to-[var(--color-surface-elevated)]/30">
          <div className="flex items-center justify-between text-xs text-[var(--color-text-secondary)]">
            <span className="font-semibold">Swarm Executions</span>
            <Activity size={15} className="text-emerald-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-600">
            {data?.totalExecutions || 0} Runs
          </div>
          <div className="text-[11px] text-[var(--color-text-secondary)]">
            Avg Latency: {data?.avgLatencyMs ? `${data.avgLatencyMs}ms` : "Sub-second execution"}
          </div>
        </Card>

        <Card className="p-4 space-y-1 bg-gradient-to-br from-[var(--color-surface)] to-[var(--color-surface-elevated)]/30">
          <div className="flex items-center justify-between text-xs text-[var(--color-text-secondary)]">
            <span className="font-semibold">AI Model Engine</span>
            <Zap size={15} className="text-cyan-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-cyan-600">
            Gemini Flash
          </div>
          <div className="text-[11px] text-[var(--color-text-secondary)]">
            Temperature: 0.2 (Deterministic Reasoning)
          </div>
        </Card>

        <Card className="p-4 space-y-1 bg-gradient-to-br from-[var(--color-surface)] to-[var(--color-surface-elevated)]/30">
          <div className="flex items-center justify-between text-xs text-[var(--color-text-secondary)]">
            <span className="font-semibold">Governance & Guardrails</span>
            <ShieldCheck size={15} className="text-emerald-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-600">
            5 Defense Layers
          </div>
          <div className="text-[11px] text-[var(--color-text-secondary)]">
            Input, Isolation, Execution, Schema, ALM
          </div>
        </Card>
      </div>

      {/* Navigation View Tabs */}
      <div className="flex flex-wrap items-center justify-between border-b border-[var(--color-border)] pb-2 gap-2">
        <div className="flex flex-wrap items-center gap-1">
          <button
            onClick={() => setActiveTab("swarm")}
            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              activeTab === "swarm"
                ? "bg-[var(--color-primary)] text-white shadow-sm font-semibold"
                : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            }`}
          >
            <Cpu size={14} />
            <span>Agent Nodes ({agentsList.length || 10})</span>
          </button>
          <button
            onClick={() => setActiveTab("pipeline")}
            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              activeTab === "pipeline"
                ? "bg-[var(--color-primary)] text-white shadow-sm font-semibold"
                : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            }`}
          >
            <Workflow size={14} />
            <span>Swarm Lifecycle Architecture</span>
          </button>
          <button
            onClick={() => setActiveTab("capabilities")}
            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              activeTab === "capabilities"
                ? "bg-[var(--color-primary)] text-white shadow-sm font-semibold"
                : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            }`}
          >
            <TableProperties size={14} />
            <span>Capabilities & Deliverables Matrix</span>
          </button>
          <button
            onClick={() => setActiveTab("activity")}
            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              activeTab === "activity"
                ? "bg-[var(--color-primary)] text-white shadow-sm font-semibold"
                : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            }`}
          >
            <Activity size={14} />
            <span>Activity Telemetry ({activityList.length})</span>
          </button>
        </div>

        {activeTab === "swarm" && (
          <div className="flex items-center gap-1 text-[11px]">
            <span className="text-[var(--color-text-secondary)] mr-1">Filter:</span>
            {(["all", "reasoning", "code", "tools", "governance"] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`rounded-md px-2 py-0.5 capitalize transition-colors ${
                  filterCategory === cat
                    ? "bg-[var(--color-surface-elevated)] font-bold text-[var(--color-primary)]"
                    : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* VIEW 1: AGENT NODES GRID */}
      {activeTab === "swarm" && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredAgents.map((agent) => (
              <AgentCard key={agent.name} agent={agent} />
            ))}
          </div>
        </div>
      )}

      {/* VIEW 2: SWARM LIFECYCLE ARCHITECTURE */}
      {activeTab === "pipeline" && (
        <div className="space-y-6">
          <Card className="p-6 space-y-6">
            <div>
              <h2 className="font-display text-base font-bold text-[var(--color-text-primary)] flex items-center gap-2">
                <Workflow size={18} className="text-[var(--color-primary)]" />
                <span>Multi-Agent Swarm Orchestration Flow</span>
              </h2>
              <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                The central Orchestrator governs linear workflow execution through 3 controlled phases with strict Human-in-the-Loop checkpoints.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              {/* Phase 1: Planning */}
              <div className="rounded-2xl border border-blue-500/30 bg-blue-500/5 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-blue-500/20 px-2 py-0.5 font-mono text-[10px] font-bold text-blue-600 uppercase">
                    Phase 1
                  </span>
                  <span className="text-[11px] font-bold text-[var(--color-text-primary)]">Planning & Specification</span>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-2.5">
                    <p className="font-semibold text-[var(--color-text-primary)]">1. Requirement Analyzer</p>
                    <p className="text-[11px] text-[var(--color-text-secondary)]">Decomposes ACs into positive, negative, and boundary test scenarios.</p>
                  </div>
                  <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-2.5">
                    <p className="font-semibold text-[var(--color-text-primary)]">2. Service Planner</p>
                    <p className="text-[11px] text-[var(--color-text-secondary)]">Maps API contracts, payload schemas, and service dependencies.</p>
                  </div>
                  <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-2.5">
                    <p className="font-semibold text-[var(--color-text-primary)]">3. Review Agent</p>
                    <p className="text-[11px] text-[var(--color-text-secondary)]">Audits contracts against the story for missing methods or payload keys.</p>
                  </div>
                  <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-2.5">
                    <p className="font-semibold text-[var(--color-text-primary)]">4. Test Generator</p>
                    <p className="text-[11px] text-[var(--color-text-secondary)]">Formulates test case matrix and maps responsible backend functions.</p>
                  </div>
                  <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-2 text-center text-amber-700 font-medium">
                    🛑 Human Gate 1: Test Plan Review & Approval
                  </div>
                </div>
              </div>

              {/* Phase 2: Synthesis & Execution */}
              <div className="rounded-2xl border border-purple-500/30 bg-purple-500/5 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-purple-500/20 px-2 py-0.5 font-mono text-[10px] font-bold text-purple-600 uppercase">
                    Phase 2
                  </span>
                  <span className="text-[11px] font-bold text-[var(--color-text-primary)]">Code Synthesis & Execution</span>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-2.5">
                    <p className="font-semibold text-[var(--color-text-primary)]">5. Code Generator</p>
                    <p className="text-[11px] text-[var(--color-text-secondary)]">Synthesizes compilable JUnit 5 / PyTest test code.</p>
                  </div>
                  <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-2.5">
                    <p className="font-semibold text-[var(--color-text-primary)]">6. API Executor</p>
                    <p className="text-[11px] text-[var(--color-text-secondary)]">Executes real HTTP / Newman requests with automatic token chaining.</p>
                  </div>
                  <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-2.5">
                    <p className="font-semibold text-[var(--color-text-primary)]">7. Code Validator</p>
                    <p className="text-[11px] text-[var(--color-text-secondary)]">Evaluates SonarQube quality rules & generates automated fixes.</p>
                  </div>
                  <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-2.5">
                    <p className="font-semibold text-[var(--color-text-primary)]">8. Evidence Generator</p>
                    <p className="text-[11px] text-[var(--color-text-secondary)]">Compiles full audit documentation with cryptographic SHA-256 seal.</p>
                  </div>
                  <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-2 text-center text-amber-700 font-medium">
                    🛑 Human Gate 2: Evidence Dossier Review
                  </div>
                </div>
              </div>

              {/* Phase 3: Governance & ALM */}
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-600 uppercase">
                    Phase 3
                  </span>
                  <span className="text-[11px] font-bold text-[var(--color-text-primary)]">Governance & ALM Sync</span>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-2 text-center text-amber-700 font-medium">
                    🛑 Human Gate 3: ALM Write-Back Authorization
                  </div>
                  <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-2.5">
                    <p className="font-semibold text-[var(--color-text-primary)]">9. ALM Agent</p>
                    <p className="text-[11px] text-[var(--color-text-secondary)]">Idempotent write-back to enterprise Jira or Azure DevOps.</p>
                  </div>
                  <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/15 p-3 text-center text-emerald-800">
                    <p className="font-bold">✓ Pipeline Completed</p>
                    <p className="text-[11px] text-emerald-700 mt-0.5">Immutable audit record permanently sealed in database.</p>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* VIEW 3: CAPABILITIES & DELIVERABLES MATRIX */}
      {activeTab === "capabilities" && (
        <Card className="space-y-4 p-5">
          <div>
            <h2 className="font-display text-sm font-bold text-[var(--color-text-primary)] flex items-center gap-2">
              <TableProperties size={16} className="text-[var(--color-primary)]" />
              <span>Full Swarm Specifications & Deliverables Matrix</span>
            </h2>
            <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
              Architectural specifications, execution tiers, primary engines, and output deliverables across all 10 registered agents.
            </p>
          </div>

          <div className="overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-[var(--color-text-secondary)] font-mono text-[11px]">
                <tr>
                  <th className="p-3">Agent Identifier</th>
                  <th className="p-3">Functional Role</th>
                  <th className="p-3">Execution Tier</th>
                  <th className="p-3">Primary Engine / Tool</th>
                  <th className="p-3">Key Output Deliverable</th>
                  <th className="p-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {AGENT_SPECS.map((t) => (
                  <tr key={t.agent} className="hover:bg-[var(--color-surface-elevated)]/30 transition-colors">
                    <td className="p-3 font-mono font-bold text-[var(--color-primary)]">
                      {t.agent}
                    </td>
                    <td className="p-3 text-[var(--color-text-primary)]">
                      {t.role}
                    </td>
                    <td className="p-3">
                      <span className="rounded bg-[var(--color-surface-elevated)] px-2 py-0.5 font-mono text-[10px] text-[var(--color-text-secondary)]">
                        {t.tier}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-[11px] text-[var(--color-text-secondary)]">
                      {t.tool}
                    </td>
                    <td className="p-3 text-emerald-700 font-medium">
                      {t.deliverable}
                    </td>
                    <td className="p-3 text-center">
                      <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-600 uppercase">
                        OPERATIONAL
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* VIEW 4: ACTIVITY TELEMETRY */}
      {activeTab === "activity" && (
        <Card className="space-y-4 p-5">
          <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
            <div>
              <h2 className="font-display text-sm font-bold text-[var(--color-text-primary)] flex items-center gap-2">
                <Activity size={16} className="text-[var(--color-primary)]" />
                <span>Live Swarm Activity Stream</span>
              </h2>
              <p className="text-xs text-[var(--color-text-secondary)]">
                Chronological execution logs recorded in the <code>agent_runs</code> audit table.
              </p>
            </div>
            <span className="rounded-full bg-[var(--color-surface-elevated)] px-2.5 py-1 font-mono text-xs text-[var(--color-text-secondary)]">
              {activityList.length} Recorded Runs
            </span>
          </div>

          {activityList.length === 0 ? (
            <div className="py-12 text-center text-xs text-[var(--color-text-secondary)]">
              No recent agent executions recorded. Launch a workflow to see live activity.
            </div>
          ) : (
            <div className="divide-y divide-[var(--color-border)] max-h-[500px] overflow-y-auto pr-1">
              {activityList.map((act: any, idx: number) => (
                <div
                  key={act.id || act.uuid || idx}
                  className="flex items-center justify-between py-3 hover:bg-[var(--color-surface-elevated)]/30 px-2 rounded-lg transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-[var(--color-text-primary)]">
                        {act.agent}
                      </span>
                      <span className="rounded bg-[var(--color-surface-elevated)] px-1.5 py-0.2 font-mono text-[10px] text-[var(--color-text-secondary)]">
                        {act.task_type}
                      </span>
                      {act.tool_name && (
                        <span className="rounded bg-blue-500/10 text-blue-600 px-1.5 py-0.2 text-[10px] font-mono">
                          {act.tool_name}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[var(--color-text-secondary)]">
                      Workflow: <span className="font-mono">{act.workflow_id ? act.workflow_id.slice(0, 8) : "Standalone"}</span> ·{" "}
                      {act.created_at ? new Date(act.created_at).toLocaleString() : ""}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    {act.latency_ms !== null && act.latency_ms !== undefined && (
                      <span className="flex items-center gap-1 font-mono text-xs text-[var(--color-text-secondary)]">
                        <Clock size={12} />
                        {act.latency_ms}ms
                      </span>
                    )}
                    <StatusBadge status={act.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
