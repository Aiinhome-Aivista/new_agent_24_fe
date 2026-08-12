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
import { Plus, BookOpen, ArrowRight, Layers } from "lucide-react";

export function StoriesPage() {
  const [params, setParams] = useSearchParams();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>(params.get("project") ?? "");
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

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
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <StatusBadge status={s.status.toUpperCase()} />
                <Link
                  to={`/app/new-workflow?story=${s.uuid}`}
                  className="flex items-center gap-1 text-xs font-medium text-[var(--color-primary)] bg-[var(--color-primary)]/10 hover:bg-[var(--color-primary)]/20 px-3 py-1.5 rounded-[8px] transition-colors">
                  Start TDD <ArrowRight size={13} />
                </Link>
              </div>
            </Card>
          ))}
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
