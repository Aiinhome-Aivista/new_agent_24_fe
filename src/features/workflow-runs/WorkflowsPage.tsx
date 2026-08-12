import { useAsync } from "@/hooks/useAsync";
import { workflowApi } from "@/services/api/workflowApi";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Loading, ErrorState } from "@/components/ui/Loading";
import { EmptyState } from "@/components/ui/EmptyState";
import { Link } from "react-router-dom";

export function WorkflowsPage() {
  const { data, loading, error, reload } = useAsync(() => workflowApi.list(), []);
  if (loading) return <Loading />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  const runs = data?.workflows ?? [];

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-6 font-display text-2xl font-semibold text-[var(--color-text-primary)]">Workflow Runs</h1>
      {runs.length === 0 ? (
        <EmptyState title="No workflow runs yet" hint="Start one from New Workflow to see it here."
          action={<Link to="/app/new-workflow" className="mt-2 text-sm font-medium text-[var(--color-primary)] hover:underline">New Workflow →</Link>} />
      ) : (
        <div className="flex flex-col gap-2">
          {runs.map((w) => (
            <Link key={w.workflow_id} to={`/app/workflows/${w.workflow_id}`}>
              <Card className="flex items-center justify-between transition-colors hover:border-[var(--color-border-orange)]">
                <div>
                  <p className="font-mono text-xs text-[var(--color-text-secondary)]">{w.workflow_id.slice(0, 8)}</p>
                  <p className="text-sm font-medium text-[var(--color-text-primary)]">{w.current_stage.replace(/_/g, " ")}</p>
                </div>
                <StatusBadge status={w.status} />
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
