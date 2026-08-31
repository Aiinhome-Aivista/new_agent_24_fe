import { useState } from "react";
import { Link } from "react-router-dom";
import { useAsync } from "@/hooks/useAsync";
import { projectApi } from "@/services/api/projectApi";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Loading, ErrorState } from "@/components/ui/Loading";
import { EmptyState } from "@/components/ui/EmptyState";
import { CreateProjectModal } from "./CreateProjectModal";
import { FolderKanban, Plus, BookOpen, Layers, Trash2, AlertTriangle, Loader2 } from "lucide-react";
import type { Project } from "@/types";

const healthColor: Record<string, string> = {
  green: "var(--color-success)", amber: "var(--color-warning)", red: "var(--color-error)",
};

export function ProjectsPage() {
  const { data, loading, error, reload } = useAsync(() => projectApi.list(), []);
  const [createOpen, setCreateOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!projectToDelete) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await projectApi.delete(projectToDelete.uuid);
      setProjectToDelete(null);
      await reload();
    } catch (err: any) {
      setDeleteError(err?.message || "Failed to delete project");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <Loading />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  const projects = data?.projects ?? [];

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-[var(--color-text-primary)]">Projects</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">Manage isolated project workspaces and knowledge bases</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="flex items-center gap-1.5">
          <Plus size={16} /> New Project
        </Button>
      </div>

      {projects.length === 0 ? (
        <EmptyState title="No projects yet" hint="Create a project to start generating TDD test suites." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <Card key={p.uuid} className="flex flex-col justify-between hover:border-[var(--color-primary)] transition-all group relative">
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FolderKanban size={18} className="text-[var(--color-primary)]" />
                    <span className="font-mono text-xs font-bold text-[var(--color-primary)]">{p.key_code}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)]">
                      <span className="h-2 w-2 rounded-full" style={{ background: healthColor[p.health] }} />
                      {p.health}
                    </span>
                    <button
                      type="button"
                      title="Delete project"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setDeleteError(null);
                        setProjectToDelete(p);
                      }}
                      className="rounded p-1 text-zinc-400 hover:bg-rose-500/10 hover:text-rose-400 transition-colors opacity-80 group-hover:opacity-100"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <Link to={`/app/projects/${p.uuid}`} className="block group-hover:text-[var(--color-primary)] transition-colors">
                  <p className="font-display font-semibold text-base text-[var(--color-text-primary)] group-hover:text-[var(--color-primary)]">{p.name}</p>
                </Link>
                {p.git_branch && (
                  <span className="inline-block mt-1 rounded bg-[var(--color-surface-elevated)] border border-[var(--color-border)] px-1.5 py-0.2 text-[10px] font-mono text-[var(--color-text-secondary)]">
                    branch: {p.git_branch}
                  </span>
                )}
                <p className="mt-2 line-clamp-2 text-sm text-[var(--color-text-secondary)]">{p.description || "No description provided."}</p>
                
                {/* Tech & Framework Badges */}
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  {p.target_language && (
                    <span className="rounded-md bg-[var(--color-primary)]/10 text-[var(--color-primary)] px-1.5 py-0.5 text-[10px] font-semibold uppercase">
                      {p.target_language}
                    </span>
                  )}
                  {p.backend_framework && p.backend_framework !== "None" && (
                    <span className="rounded-md bg-[var(--color-surface-elevated)] border border-[var(--color-border)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-text-secondary)]">
                      {p.backend_framework.split("(")[0].trim()}
                    </span>
                  )}
                  {p.frontend_framework && p.frontend_framework !== "None" && (
                    <span className="rounded-md bg-[var(--color-primary)]/5 border border-[var(--color-border-orange)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-primary)]">
                      {p.frontend_framework.split("/")[0].trim()}
                    </span>
                  )}
                  {p.testing_framework && (
                    <span className="rounded-md bg-[var(--color-surface-elevated)] border border-[var(--color-border)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-text-secondary)]">
                      {p.testing_framework.split("+")[0].trim()}
                    </span>
                  )}
                </div>

                <div className="mt-3 flex gap-4 text-xs text-[var(--color-text-secondary)]">
                  <span>{p.story_count ?? 0} stories</span>
                  <span>{p.active_workflows ?? 0} active runs</span>
                </div>
              </div>

              {/* Quick Workspace Actions */}
              <div className="mt-4 flex items-center justify-between border-t border-[var(--color-border)] pt-3 text-xs">
                <Link
                  to={`/app/projects/${p.uuid}`}
                  className="flex items-center gap-1 text-[var(--color-primary)] hover:underline font-semibold"
                >
                  Open Dashboard →
                </Link>
                <div className="flex items-center gap-3">
                  <Link
                    to={`/app/knowledge?project=${p.uuid}`}
                    className="flex items-center gap-1 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
                  >
                    <BookOpen size={12} /> Knowledge
                  </Link>
                  <Link
                    to={`/app/stories?project=${p.uuid}`}
                    className="flex items-center gap-1 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
                  >
                    <Layers size={12} /> Stories
                  </Link>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {projectToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-rose-500/10 p-2 text-rose-400 shrink-0">
                <AlertTriangle size={22} />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-bold text-[var(--color-text-primary)]">
                  Delete Project
                </h3>
                <p className="text-xs text-[var(--color-text-secondary)] mt-1 leading-relaxed">
                  Are you sure you want to delete <strong className="text-white font-semibold">{projectToDelete.name}</strong> ({projectToDelete.key_code})?
                </p>
                <p className="text-[11px] text-rose-300/90 mt-1.5 bg-rose-500/10 border border-rose-500/20 rounded p-2">
                  This will permanently delete this project, including its stories, knowledge documents, API contracts, and workflow execution history.
                </p>
              </div>
            </div>

            {deleteError && (
              <div className="rounded-lg bg-rose-500/15 border border-rose-500/30 p-2.5 text-xs text-rose-300">
                {deleteError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[var(--color-border)]">
              <Button
                variant="secondary"
                onClick={() => {
                  setProjectToDelete(null);
                  setDeleteError(null);
                }}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-1.5"
              >
                {deleting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 size={14} /> Delete Project
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      <CreateProjectModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        onSuccess={reload}
      />
    </div>
  );
}
