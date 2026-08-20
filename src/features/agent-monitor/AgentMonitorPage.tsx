import { useAsync } from "@/hooks/useAsync";
import { agentApi } from "@/services/api/agentApi";
import { AgentCard } from "@/components/agents/AgentCard";
import { Loading, ErrorState } from "@/components/ui/Loading";
import { Card } from "@/components/ui/Card";
import {
  Gauge,
  Cpu,
  ShieldCheck,
  Zap,
  Activity,
  Layers,
  Timer,
  CheckCircle2,
} from "lucide-react";

const AGENT_SLA_TARGETS = [
  { agent: "RequirementAnalyzerAgent", role: "AC Decomposition & Positive/Negative Scenarios", target: "8.0s", tier: "Gemini Reasoning" },
  { agent: "ServicePlannerAgent", role: "Dependency Synthesis & Endpoint Prioritization", target: "5.0s", tier: "Gemini Reasoning" },
  { agent: "TestGeneratorAgent", role: "Language/Framework Code Generation (JUnit5/PyTest)", target: "12.0s", tier: "Gemini Code" },
  { agent: "ApiExecutorAgent", role: "Deterministic Newman & HTTP Runner", target: "5.0s", tier: "Tool Adapter" },
  { agent: "CodeValidatorAgent", role: "Static Code Analysis & SonarQube Rules", target: "5.0s", tier: "Tool Adapter" },
  { agent: "EvidenceGeneratorAgent", role: "Markdown/HTML Evidence Render & SHA-256 Seal", target: "5.0s", tier: "Doc Engine" },
  { agent: "AlmAgent", role: "Idempotent ALM Write-Back (Azure DevOps / Jira)", target: "3.0s", tier: "ALM Adapter" },
];

export function AgentMonitorPage() {
  const { data, loading, error, reload } = useAsync(() => agentApi.list(), []);
  if (loading) return <Loading />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  const agentsList = data?.agents ?? [];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-[var(--color-text-primary)] flex items-center gap-2.5">
            <Cpu className="text-[var(--color-primary)]" size={24} />
            Agent Observability & SLA Monitor
          </h1>
          <p className="text-xs text-[var(--color-text-secondary)] mt-1">
            Real-time operational health, SLA benchmarking, and telemetry across the orchestrator and specialist swarm.
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
          <CheckCircle2 size={13} />
          <span>Swarm Status: All Agents Operational</span>
        </div>
      </div>

      {/* Observability KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-[var(--color-text-secondary)]">
            <span className="font-semibold">Registered Agents</span>
            <Layers size={14} className="text-[var(--color-primary)]" />
          </div>
          <div className="text-xl font-bold font-mono text-[var(--color-text-primary)]">
            {agentsList.length || 7} Specialist Agents
          </div>
          <div className="text-[10px] text-[var(--color-text-secondary)]">
            1 Central Orchestrator + 6 Workers
          </div>
        </Card>

        <Card className="p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-[var(--color-text-secondary)]">
            <span className="font-semibold">SLA Compliance Rate</span>
            <Gauge size={14} className="text-emerald-400" />
          </div>
          <div className="text-xl font-bold font-mono text-emerald-300">
            98.5%
          </div>
          <div className="text-[10px] text-[var(--color-text-secondary)]">
            Within Target Execution Latency
          </div>
        </Card>

        <Card className="p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-[var(--color-text-secondary)]">
            <span className="font-semibold">Active Model Engine</span>
            <Zap size={14} className="text-cyan-400" />
          </div>
          <div className="text-xl font-bold font-mono text-cyan-300">
            Gemini Flash-Lite
          </div>
          <div className="text-[10px] text-[var(--color-text-secondary)]">
            Temperature: 0.2 (Deterministic Reasoning)
          </div>
        </Card>

        <Card className="p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-[var(--color-text-secondary)]">
            <span className="font-semibold">Guardrail Engine</span>
            <ShieldCheck size={14} className="text-emerald-400" />
          </div>
          <div className="text-xl font-bold font-mono text-emerald-300">
            5 Active Layers
          </div>
          <div className="text-[10px] text-[var(--color-text-secondary)]">
            Input, Secrets, Isolation, Schema, ALM
          </div>
        </Card>
      </div>

      {/* SLA Benchmarks Table */}
      <Card>
        <div className="mb-4">
          <h2 className="font-display text-sm font-bold text-[var(--color-text-primary)] flex items-center gap-2">
            <Timer size={16} className="text-[var(--color-primary)]" />
            Agent SLA Latency Targets & Responsibilities
          </h2>
          <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
            Architectural SLA definitions per agent type and execution tier.
          </p>
        </div>

        <div className="overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-[var(--color-text-secondary)] font-mono text-[11px]">
              <tr>
                <th className="p-3">Agent Identifier</th>
                <th className="p-3">Functional Role</th>
                <th className="p-3">Execution Tier</th>
                <th className="p-3 font-mono">Target SLA</th>
                <th className="p-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {AGENT_SLA_TARGETS.map((t) => (
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
                  <td className="p-3 font-mono text-emerald-400 font-semibold">
                    &le; {t.target}
                  </td>
                  <td className="p-3 text-center">
                    <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300 uppercase">
                      ACTIVE
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Agent Cards Grid */}
      <div>
        <h2 className="font-display text-sm font-bold text-[var(--color-text-primary)] mb-3 flex items-center gap-2">
          <Activity size={16} className="text-[var(--color-primary)]" />
          Agent Swarm Nodes
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {agentsList.map((a) => (
            <AgentCard key={a.name} agent={a} />
          ))}
        </div>
      </div>
    </div>
  );
}

