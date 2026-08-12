import { useState } from "react";
import { Link } from "react-router-dom";
import { useAsync } from "@/hooks/useAsync";
import { projectApi } from "@/services/api/projectApi";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Loading, ErrorState } from "@/components/ui/Loading";
import { EmptyState } from "@/components/ui/EmptyState";
import { CreateProjectModal } from "./CreateProjectModal";
import { FolderKanban, Plus, BookOpen, Layers } from "lucide-react";

const healthColor: Record<string, string> = {
  green: "var(--color-success)", amber: "var(--color-warning)", red: "var(--color-error)",
};

export function ProjectsPage() {
  const { data, loading, error, reload } = useAsync(() => projectApi.list(), []);
  const [createOpen, setCreateOpen] = useState(false);

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
            <Card key={p.uuid} className="flex flex-col justify-between">
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <FolderKanban size={18} className="text-[var(--color-primary)]" />
                  <span className="flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)]">
                    <span className="h-2 w-2 rounded-full" style={{ background: healthColor[p.health] }} />
                    {p.health}
                  </span>
                </div>
                <p className="font-display font-semibold text-[var(--color-text-primary)]">{p.name}</p>
                <p className="font-mono text-xs text-[var(--color-text-secondary)]">{p.key_code}</p>
                <p className="mt-2 line-clamp-2 text-sm text-[var(--color-text-secondary)]">{p.description}</p>
                <div className="mt-3 flex gap-4 text-xs text-[var(--color-text-secondary)]">
                  <span>{p.story_count ?? 0} stories</span>
                  <span>{p.active_workflows ?? 0} active runs</span>
                </div>
              </div>

              {/* Quick Workspace Actions */}
              <div className="mt-4 flex items-center justify-between border-t border-[var(--color-border)] pt-3 text-xs">
                <Link
                  to={`/app/knowledge?project=${p.uuid}`}
                  className="flex items-center gap-1 text-[var(--color-primary)] hover:underline font-medium">
                  <BookOpen size={13} /> Knowledge Base
                </Link>
                <Link
                  to={`/app/stories?project=${p.uuid}`}
                  className="flex items-center gap-1 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">
                  <Layers size={13} /> Stories
                </Link>
              </div>
            </Card>
          ))}
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
