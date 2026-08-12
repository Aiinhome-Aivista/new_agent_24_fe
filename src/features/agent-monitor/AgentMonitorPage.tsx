import { useAsync } from "@/hooks/useAsync";
import { agentApi } from "@/services/api/agentApi";
import { AgentCard } from "@/components/agents/AgentCard";
import { Loading, ErrorState } from "@/components/ui/Loading";

export function AgentMonitorPage() {
  const { data, loading, error, reload } = useAsync(() => agentApi.list(), []);
  if (loading) return <Loading />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-1 font-display text-2xl font-semibold text-[var(--color-text-primary)]">Agent Monitor</h1>
      <p className="mb-6 text-sm text-[var(--color-text-secondary)]">Operational status across the orchestrator and specialist agents. Chain-of-thought is never shown.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {(data?.agents ?? []).map((a) => <AgentCard key={a.name} agent={a} />)}
      </div>
    </div>
  );
}
