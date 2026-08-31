import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { storyApi } from "@/services/api/storyApi";
import { projectApi } from "@/services/api/projectApi";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Loading, ErrorState } from "@/components/ui/Loading";
import { EmptyState } from "@/components/ui/EmptyState";
import { CreateStoryModal } from "./CreateStoryModal";
import type { Story, Project } from "@/types";
import { Plus, ArrowRight, GitBranch, Trash2, AlertTriangle, Loader2 } from "lucide-react";

export function StoriesPage() {
  const [params, setParams] = useSearchParams();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>(params.get("project") ?? "");
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [storyToDelete, setStoryToDelete] = useState<Story | null>(null);
  const [deletingStory, setDeletingStory] = useState(false);
  const [deleteStoryError, setDeleteStoryError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [pRes, sRes] = await Promise.all([
        projectApi.list(),
        storyApi.list(selectedProject || undefined),
      ]);
      setProjects(pRes.projects ?? []);
      setStories(sRes.stories ?? []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStory = async () => {
    if (!storyToDelete) return;
    setDeletingStory(true);
    setDeleteStoryError(null);
    try {
      await storyApi.delete(storyToDelete.uuid);
      setStoryToDelete(null);
      await loadData();
    } catch (err: any) {
      setDeleteStoryError(err?.message || "Failed to delete story");
    } finally {
      setDeletingStory(false);
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

  const filteredStories = stories.filter(
    (s) =>
      s.title.toLowerCase().includes(q.toLowerCase()) ||
      (s.external_key ?? "").toLowerCase().includes(q.toLowerCase()) ||
      (s.project_key ?? "").toLowerCase().includes(q.toLowerCase())
  );

  if (loading && stories.length === 0) return <Loading />;
  if (error) return <ErrorState message={error} onRetry={loadData} />;

  return (
    <div className="mx-auto max-w-5xl">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-[var(--color-text-primary)]">User Stories & Acceptance Criteria</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">Manage requirements and start autonomous TDD test generation pipelines</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="flex items-center gap-1.5">
          <Plus size={16} /> New Story
        </Button>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <label className="text-xs text-[var(--color-text-secondary)]">Filter Project:</label>
          <select
            value={selectedProject}
            onChange={(e) => handleProjectFilter(e.target.value)}
            className="rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs text-[var(--color-text-primary)] focus:border-[var(--color-primary)] focus:outline-none">
            <option value="">All Projects</option>
            {projects.map((p) => (
              <option key={p.uuid} value={p.uuid}>
                {p.key_code} — {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="w-64">
          <Input placeholder="Search stories or keys…" value={q} onChange={(e) => setQ(e.target.value)} className="text-xs" />
        </div>
      </div>

      {filteredStories.length === 0 ? (
        <EmptyState
          title="No user stories found"
          hint="Create a user story with acceptance criteria to generate tests."
        />
      ) : (
        <div className="flex flex-col gap-3">
          {filteredStories.map((s) => (
            <Card key={s.uuid} className="flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors hover:border-[var(--color-border-orange)]">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs font-semibold text-[var(--color-primary)] bg-[var(--color-primary)]/10 px-2 py-0.5 rounded">
                    {s.external_key}
                  </span>
                  {s.project_key && (
                    <span className="text-xs font-mono text-[var(--color-text-secondary)] border border-[var(--color-border)] px-1.5 py-0.5 rounded">
                      {s.project_key}
                    </span>
                  )}
                  <span className="text-sm font-semibold text-[var(--color-text-primary)]">{s.title}</span>
                </div>
                {s.description && (
                  <p className="line-clamp-2 text-xs text-[var(--color-text-secondary)] mb-2">
                    {s.description}
                  </p>
                )}
                <div className="flex items-center gap-3 text-xs text-[var(--color-text-secondary)]">
                  <span>{s.sprint || "Sprint 1"}</span>
                  <span>·</span>
                  <span>Coverage: {Number(s.coverage_pct)}%</span>
                  {s.workflow_status && (
                    <>
                      <span>·</span>
                      <span className="font-mono font-medium text-emerald-400">
                        Workflow: {s.workflow_status}
                      </span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                <StatusBadge status={s.status.toUpperCase()} />
                {s.workflow_id ? (
                  <Link
                    to={`/app/workflows/${s.workflow_id}${s.project_uuid || selectedProject ? `?project=${s.project_uuid || selectedProject}` : ""}`}
                    className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 px-3 py-1.5 rounded-[8px] transition-colors shadow-sm"
                  >
                    <GitBranch size={13} /> View Workflow <ArrowRight size={12} />
                  </Link>
                ) : (
                  <Link
                    to={`/app/new-workflow?story=${s.uuid}${s.project_uuid || selectedProject ? `&project=${s.project_uuid || selectedProject}` : ""}`}
                    className="flex items-center gap-1 text-xs font-medium text-[var(--color-primary)] bg-[var(--color-primary)]/10 hover:bg-[var(--color-primary)]/20 px-3 py-1.5 rounded-[8px] transition-colors"
                  >
                    Start TDD <ArrowRight size={13} />
                  </Link>
                )}
                <button
                  type="button"
                  title="Delete story"
                  onClick={() => {
                    setDeleteStoryError(null);
                    setStoryToDelete(s);
                  }}
                  className="rounded p-1.5 text-zinc-400 hover:bg-rose-500/10 hover:text-rose-400 transition-colors"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Story Confirmation Modal */}
      {storyToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-rose-500/10 p-2 text-rose-400 shrink-0">
                <AlertTriangle size={22} />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-bold text-[var(--color-text-primary)]">
                  Delete User Story
                </h3>
                <p className="text-xs text-[var(--color-text-secondary)] mt-1 leading-relaxed">
                  Are you sure you want to delete <strong className="text-white font-semibold">{storyToDelete.external_key}: {storyToDelete.title}</strong>?
                </p>
                <p className="text-[11px] text-rose-300/90 mt-1.5 bg-rose-500/10 border border-rose-500/20 rounded p-2">
                  This will remove the story, its acceptance criteria, and any associated test and knowledge data from the database.
                </p>
              </div>
            </div>

            {deleteStoryError && (
              <div className="rounded-lg bg-rose-500/15 border border-rose-500/30 p-2.5 text-xs text-rose-300">
                {deleteStoryError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[var(--color-border)]">
              <Button
                variant="secondary"
                onClick={() => {
                  setStoryToDelete(null);
                  setDeleteStoryError(null);
                }}
                disabled={deletingStory}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleDeleteStory}
                disabled={deletingStory}
                className="flex items-center gap-1.5"
              >
                {deletingStory ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 size={14} /> Delete Story
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      <CreateStoryModal
        isOpen={createOpen}
        projects={projects}
        defaultProjectUuid={selectedProject}
        onClose={() => setCreateOpen(false)}
        onSuccess={loadData}
      />
    </div>
  );
}
