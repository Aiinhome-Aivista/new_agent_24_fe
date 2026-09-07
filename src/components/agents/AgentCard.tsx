import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { AgentInfo } from "@/types";
import {
  Crown,
  Layers,
  Code,
  Send,
  ShieldCheck,
  FileText,
  Share2,
  Clock,
  Sparkles,
  Bot,
  Activity,
  CheckCircle2,
} from "lucide-react";

function getAgentIcon(name: string) {
  switch (name) {
    case "orchestrator":
      return <Crown size={18} className="text-amber-500" />;
    case "requirement_analyzer":
      return <FileText size={18} className="text-blue-500" />;
    case "service_planner":
      return <Layers size={18} className="text-purple-500" />;
    case "review_agent":
      return <ShieldCheck size={18} className="text-orange-500" />;
    case "test_generator":
      return <Sparkles size={18} className="text-emerald-500" />;
    case "code_generator":
      return <Code size={18} className="text-cyan-500" />;
    case "api_executor":
      return <Send size={18} className="text-rose-500" />;
    case "code_validator":
      return <Activity size={18} className="text-teal-500" />;
    case "evidence_generator":
      return <CheckCircle2 size={18} className="text-indigo-500" />;
    case "alm_agent":
      return <Share2 size={18} className="text-amber-600" />;
    default:
      return <Bot size={18} className="text-[var(--color-primary)]" />;
  }
}

export function AgentCard({ agent }: { agent: AgentInfo }) {
  const isOrchestrator = agent.name === "orchestrator";

  return (
    <Card
      className={`p-4 transition-all hover:border-[var(--color-border-orange)] flex flex-col justify-between gap-3 ${
        isOrchestrator
          ? "border-amber-500/40 bg-gradient-to-br from-[var(--color-surface)] to-amber-500/5 shadow-sm"
          : "bg-[var(--color-surface)]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] shadow-inner">
            {getAgentIcon(agent.name)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display font-semibold text-sm text-[var(--color-text-primary)]">
                {agent.label}
              </h3>
              {isOrchestrator && (
                <span className="rounded-full bg-amber-500/15 border border-amber-500/30 px-2 py-0.2 text-[9px] font-bold text-amber-600 uppercase tracking-wider">
                  Conductor
                </span>
              )}
            </div>
            <p className="font-mono text-[11px] text-[var(--color-text-secondary)] mt-0.5">
              {agent.name}
            </p>
          </div>
        </div>

        <div>
          {agent.last_run ? (
            <StatusBadge status={agent.last_run.status} />
          ) : (
            <span className="inline-flex items-center rounded-full bg-[var(--color-surface-elevated)] px-2 py-0.5 text-[10px] font-medium text-[var(--color-text-secondary)]">
              STANDBY
            </span>
          )}
        </div>
      </div>

      {agent.role && (
        <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
          {agent.role}
        </p>
      )}

      {/* Badges & Telemetry Row */}
      <div className="pt-2 border-t border-[var(--color-border)] flex flex-wrap items-center justify-between gap-2 text-[10px]">
        <div className="flex flex-wrap items-center gap-1.5">
          {agent.tier && (
            <span className="rounded bg-[var(--color-surface-elevated)] px-2 py-0.5 font-medium text-[var(--color-text-secondary)]">
              {agent.tier}
            </span>
          )}
          {agent.model_or_tool && (
            <span className="rounded bg-[var(--color-primary)]/10 text-[var(--color-primary)] px-2 py-0.5 font-mono font-medium">
              {agent.model_or_tool}
            </span>
          )}
        </div>

        {agent.last_run && (
          <div className="flex items-center gap-1.5 font-mono text-[10px] text-[var(--color-text-secondary)] ml-auto">
            <Clock size={11} />
            {agent.last_run.latency_ms !== undefined && agent.last_run.latency_ms !== null && (
              <span className="font-semibold text-emerald-600">
                {agent.last_run.latency_ms}ms
              </span>
            )}
            <span>
              {new Date(agent.last_run.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        )}
      </div>
    </Card>
  );
}
