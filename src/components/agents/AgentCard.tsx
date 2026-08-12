import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { AgentInfo } from "@/types";
import { Bot } from "lucide-react";

export function AgentCard({ agent }: { agent: AgentInfo }) {
  return (
    <Card className="flex items-start justify-between">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-[10px] bg-[var(--color-surface-elevated)] text-[var(--color-primary)]">
          <Bot size={18} />
        </div>
        <div>
          <p className="font-display font-semibold text-[var(--color-text-primary)]">{agent.label}</p>
          <p className="font-mono text-xs text-[var(--color-text-secondary)]">{agent.name}</p>
        </div>
      </div>
      {agent.last_run ? <StatusBadge status={agent.last_run.status} /> : (
        <span className="text-xs text-[var(--color-text-secondary)]">idle</span>
      )}
    </Card>
  );
}
