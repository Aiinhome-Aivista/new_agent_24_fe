import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { workflowApi } from "@/services/api/workflowApi";
import { projectApi } from "@/services/api/projectApi";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Loading, ErrorState } from "@/components/ui/Loading";
import { EmptyState } from "@/components/ui/EmptyState";
import type { WorkflowRun, Project } from "@/types";
import { GitBranch, Plus, ShieldAlert, RefreshCw, Layers } from "lucide-react";

export function WorkflowsPage() {
  const [params, setParams] = useSearchParams();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>(params.get("project") ?? "");
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [pRes, wRes] = await Promise.all([
        projectApi.list(),
        workflowApi.list(),
      ]);
      setProjects(pRes.projects ?? []);
      let workflowList = wRes.workflows ?? [];
      if (selectedProject) {
        workflowList = workflowList.filter((w) => w.project_uuid === selectedProject);
      }
      setRuns(workflowList);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedProject]);

  const handleProjectFilter = (pUuid: string) => {
    setSelectedProject(pUuid);
    if (pUuid) {
      setParams({ project: pUuid });
    } else {
      setParams({});
    }
  };

  if (loading && runs.length === 0) return <Loading />;
  if (error) return <ErrorState message={error} onRetry={loadData} />;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-[var(--color-text-primary)]">
            TDD Workflow Runs
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Autonomous TDD test generation pipelines with human-in-the-loop checkpoints
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            onClick={loadData}
            className="flex items-center gap-1 text-xs py-1.5 px-3"
          >
            <RefreshCw size={13} /> Refresh
          </Button>

          <Link
            to={`/app/new-workflow${selectedProject ? `?project=${selectedProject}` : ""}`}
            className="flex items-center gap-1.5 rounded-lg bg-[var(--color-primary)] px-3 py-2 text-xs font-semibold text-white shadow-sm hover:opacity-90 transition-opacity"
          >
            <Plus size={15} /> New Workflow
          </Link>
        </div>
      </div>

      {/* Filter Bar */}
      {projects.length > 0 && (
        <div className="flex items-center gap-2">
          <label className="text-xs text-[var(--color-text-secondary)]">Filter Project:</label>
          <select
            value={selectedProject}
            onChange={(e) => handleProjectFilter(e.target.value)}
            className="rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs text-[var(--color-text-primary)] focus:border-[var(--color-primary)] focus:outline-none"
          >
            <option value="">All Projects</option>
            {projects.map((p) => (
              <option key={p.uuid} value={p.uuid}>
                {p.key_code} — {p.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {runs.length === 0 ? (
        <EmptyState
          title="No workflow runs found"
          hint="Start an autonomous TDD workflow from a user story to see it here."
          action={
            <Link
              to={`/app/new-workflow${selectedProject ? `?project=${selectedProject}` : ""}`}
              className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-[var(--color-primary)] hover:underline"
            >
              Start New Workflow →
            </Link>
          }
        />
      ) : (
        <div className="flex flex-col gap-2.5">
          {runs.map((w) => {
            const isWaiting =
              w.status === "WAITING_FOR_REVIEW" || w.status === "WAITING_FOR_APPROVAL";
            const targetProj = selectedProject || w.project_uuid;
            const linkUrl = `/app/workflows/${w.workflow_id}${targetProj ? `?project=${targetProj}` : ""}`;

            return (
              <Link key={w.workflow_id} to={linkUrl}>
                <Card className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 transition-all hover:border-[var(--color-border-orange)] group">
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors ${
                        isWaiting
                          ? "bg-amber-500/20 text-amber-400 animate-pulse"
                          : "bg-[var(--color-surface-elevated)] text-[var(--color-primary)]"
                      }`}
                    >
                      {isWaiting ? <ShieldAlert size={18} /> : <GitBranch size={18} />}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        {w.story_key && (
                          <span className="font-mono text-xs font-bold text-[var(--color-primary)] bg-[var(--color-primary)]/10 px-1.5 py-0.2 rounded">
                            {w.story_key}
                          </span>
                        )}
                        {w.project_key && (
                          <span className="font-mono text-[10px] text-[var(--color-text-secondary)] border border-[var(--color-border)] px-1 rounded">
                            {w.project_key}
                          </span>
                        )}
                        <span className="text-sm font-semibold text-[var(--color-text-primary)] group-hover:text-[var(--color-primary)] transition-colors">
                          {w.story_title || `Workflow ${w.workflow_id.slice(0, 8)}`}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-[var(--color-text-secondary)]">
                        <span className="font-mono text-[11px] text-[var(--color-text-secondary)]">
                          ID: {w.workflow_id.slice(0, 8)}…
                        </span>
                        <span>·</span>
                        <span className="font-medium text-[var(--color-text-primary)]">
                          Stage: {w.current_stage.replace(/_/g, " ")}
                        </span>
                        {w.created_at && (
                          <>
                            <span>·</span>
                            <span>{new Date(w.created_at).toLocaleDateString()}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
                    {isWaiting && (
                      <span className="rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-400 animate-pulse">
                        Awaiting Human Action
                      </span>
                    )}
                    <StatusBadge status={w.status} />
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
