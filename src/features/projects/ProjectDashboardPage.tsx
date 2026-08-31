import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { projectApi } from "@/services/api/projectApi";
import { storyApi } from "@/services/api/storyApi";
import { knowledgeApi } from "@/services/api/knowledgeApi";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Loading, ErrorState } from "@/components/ui/Loading";
import { CreateStoryModal } from "@/features/stories/CreateStoryModal";
import { useToast } from "@/contexts/ToastContext";
import type { Project, Story, ApiContract, KnowledgeDocument, KnowledgeChunk, GitConnectionResult } from "@/types";
import {
  FolderKanban,
  ArrowLeft,
  BookOpen,
  GitBranch,
  FileCheck2,
  Layers,
  Code2,
  Plus,
  ExternalLink,
  Search,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  Play,
  FileText,
  Activity,
  Terminal,
  Server,
  UploadCloud,
  Plug,
  Loader2,
  Trash2,
  AlertTriangle,
} from "lucide-react";

const healthColor: Record<string, string> = {
  green: "var(--color-success)",
  amber: "var(--color-warning)",
  red: "var(--color-error)",
};

type ActiveTab = "overview" | "stories" | "knowledge" | "contracts" | "workflows";

export function ProjectDashboardPage() {
  const { uuid } = useParams<{ uuid: string }>();
  const navigate = useNavigate();
  const { notify } = useToast();

  const [project, setProject] = useState<Project | null>(null);
  const [stories, setStories] = useState<Story[]>([]);
  const [knowledge, setKnowledge] = useState<KnowledgeDocument[]>([]);
  const [contracts, setContracts] = useState<{ services: any[]; contracts: ApiContract[] }>({ services: [], contracts: [] });
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");
  const [createStoryOpen, setCreateStoryOpen] = useState(false);
  const [testingGit, setTestingGit] = useState(false);
  const [gitResult, setGitResult] = useState<GitConnectionResult | null>(null);
  const [storyToDelete, setStoryToDelete] = useState<Story | null>(null);
  const [deletingStory, setDeletingStory] = useState(false);
  const [deleteStoryError, setDeleteStoryError] = useState<string | null>(null);

  const handleDeleteStory = async () => {
    if (!storyToDelete) return;
    setDeletingStory(true);
    setDeleteStoryError(null);
    try {
      await storyApi.delete(storyToDelete.uuid);
      notify("success", `Story ${storyToDelete.external_key} deleted successfully`);
      setStoryToDelete(null);
      await loadProjectData();
    } catch (err: any) {
      setDeleteStoryError(err?.message || "Failed to delete story");
    } finally {
      setDeletingStory(false);
    }
  };

  // RAG Query Sandbox State
  const [ragQuery, setRagQuery] = useState("");
  const [ragResults, setRagResults] = useState<KnowledgeChunk[]>([]);
  const [ragLoading, setRagLoading] = useState(false);

  const loadProjectData = async () => {
    if (!uuid) return;
    try {
      setLoading(true);
      const res = await projectApi.detail(uuid);
      setProject(res.project);
      setStories(res.stories || []);
      setKnowledge(res.knowledge || []);
      setContracts(res.contracts || { services: [], contracts: [] });
      setWorkflows(res.workflows || []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjectData();
  }, [uuid]);

  const handleTestGitConnection = async () => {
    if (!uuid || !project) return;
    if (!project.git_repo_url) {
      notify("error", "No Git repository URL configured for this project.");
      return;
    }
    setTestingGit(true);
    setGitResult(null);
    try {
      const res = await projectApi.testProjectGitConnection(uuid);
      setGitResult(res);
      if (res.connected) {
        notify("success", res.message);
      } else {
        notify("error", res.message);
      }
    } catch (err) {
      const msg = (err as Error).message || "Failed to test Git connection";
      setGitResult({
        connected: false,
        status: "NETWORK_ERROR",
        message: msg,
      });
      notify("error", msg);
    } finally {
      setTestingGit(false);
    }
  };

  const handleRagSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ragQuery.trim() || !uuid) return;
    setRagLoading(true);
    try {
      const res = await knowledgeApi.query(uuid, ragQuery.trim());
      setRagResults(res.chunks || []);
      if ((res.chunks || []).length === 0) {
        notify("info", "No matching knowledge chunks found for this query.");
      }
    } catch (err) {
      notify("error", (err as Error).message);
    } finally {
      setRagLoading(false);
    }
  };

  if (loading) return <Loading />;
  if (error || !project) return <ErrorState message={error || "Project not found"} onRetry={loadProjectData} />;

  const avgCoverage = stories.length > 0
    ? Math.round(stories.reduce((acc, s) => acc + (s.coverage_pct || 0), 0) / stories.length)
    : 0;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Back to Projects Navigation Link */}
      <div className="flex items-center justify-between">
        <Link
          to="/app/projects"
          className="inline-flex items-center gap-2 text-xs font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors"
        >
          <ArrowLeft size={15} /> Back to All Projects
        </Link>
        <span className="font-mono text-xs text-[var(--color-text-secondary)]">UUID: {project.uuid}</span>
      </div>

      {/* Project Hero Card */}
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="rounded-lg bg-[var(--color-primary)] px-2.5 py-1 font-mono text-xs font-bold text-white shadow-sm">
                {project.key_code}
              </span>
              <h1 className="font-display text-2xl font-bold text-[var(--color-text-primary)]">{project.name}</h1>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-2.5 py-0.5 text-xs text-[var(--color-text-secondary)]">
                <span className="h-2 w-2 rounded-full" style={{ background: healthColor[project.health] || "var(--color-success)" }} />
                {project.health}
              </span>
            </div>

            <p className="text-sm text-[var(--color-text-secondary)] max-w-3xl leading-relaxed">
              {project.description || "No project description provided."}
            </p>

            {/* Badges Bar */}
            <div className="flex flex-wrap items-center gap-2 pt-2 text-xs">
              {project.target_language && (
                <span className="rounded-md bg-[var(--color-primary)]/10 text-[var(--color-primary)] px-2 py-0.5 font-semibold uppercase">
                  {project.target_language}
                </span>
              )}
              {project.backend_framework && project.backend_framework !== "None" && (
                <span className="rounded-md bg-[var(--color-surface-elevated)] border border-[var(--color-border)] px-2 py-0.5 text-[var(--color-text-primary)] font-medium">
                  {project.backend_framework}
                </span>
              )}
              {project.frontend_framework && project.frontend_framework !== "None" && (
                <span className="rounded-md bg-[var(--color-primary)]/5 border border-[var(--color-border-orange)] px-2 py-0.5 text-[var(--color-primary)] font-medium">
                  {project.frontend_framework}
                </span>
              )}
              {project.app_type && (
                <span className="rounded-md bg-[var(--color-surface-elevated)] border border-[var(--color-border)] px-2 py-0.5 text-[var(--color-text-secondary)]">
                  {project.app_type}
                </span>
              )}
              {project.git_branch && (
                <span className="inline-flex items-center gap-1 rounded-md bg-[var(--color-surface-elevated)] border border-[var(--color-border)] px-2 py-0.5 font-mono text-[var(--color-text-secondary)]">
                  <GitBranch size={12} /> {project.git_branch}
                </span>
              )}
              {project.git_repo_url && (
                <a
                  href={project.git_repo_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-md bg-[var(--color-surface-elevated)] border border-[var(--color-border)] px-2 py-0.5 text-[var(--color-primary)] hover:underline"
                >
                  <ExternalLink size={12} /> GitHub Repo
                </a>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <Button
              onClick={() => navigate(`/app/new-workflow?project=${project.uuid}`)}
              className="flex items-center gap-1.5 text-xs font-semibold"
            >
              <Plus size={15} /> New Workflow
            </Button>
            <Button
              variant="secondary"
              onClick={() => setCreateStoryOpen(true)}
              className="flex items-center gap-1.5 text-xs"
            >
              <BookOpen size={14} /> Add Story
            </Button>
            <Button
              variant="secondary"
              onClick={() => navigate(`/app/knowledge?project=${project.uuid}`)}
              className="flex items-center gap-1.5 text-xs"
            >
              <UploadCloud size={14} /> Knowledge
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="flex flex-col justify-between p-4">
          <div className="flex items-center justify-between text-[var(--color-text-secondary)]">
            <span className="text-xs font-medium">User Stories</span>
            <BookOpen size={16} className="text-[var(--color-primary)]" />
          </div>
          <div className="mt-2">
            <p className="font-display text-2xl font-bold text-[var(--color-text-primary)]">{stories.length}</p>
            <p className="text-[11px] text-[var(--color-text-secondary)]">Avg. Coverage: {avgCoverage}%</p>
          </div>
        </Card>

        <Card className="flex flex-col justify-between p-4">
          <div className="flex items-center justify-between text-[var(--color-text-secondary)]">
            <span className="text-xs font-medium">Workflows Run</span>
            <GitBranch size={16} className="text-[var(--color-primary)]" />
          </div>
          <div className="mt-2">
            <p className="font-display text-2xl font-bold text-[var(--color-text-primary)]">{workflows.length}</p>
            <p className="text-[11px] text-[var(--color-text-secondary)]">
              {workflows.filter((w) => w.status === "COMPLETED").length} completed
            </p>
          </div>
        </Card>

        <Card className="flex flex-col justify-between p-4">
          <div className="flex items-center justify-between text-[var(--color-text-secondary)]">
            <span className="text-xs font-medium">Knowledge Docs</span>
            <Layers size={16} className="text-[var(--color-primary)]" />
          </div>
          <div className="mt-2">
            <p className="font-display text-2xl font-bold text-[var(--color-text-primary)]">{knowledge.length}</p>
            <p className="text-[11px] text-[var(--color-text-secondary)]">
              {knowledge.reduce((acc, k) => acc + (k.chunk_count || 0), 0)} vector chunks
            </p>
          </div>
        </Card>

        <Card className="flex flex-col justify-between p-4">
          <div className="flex items-center justify-between text-[var(--color-text-secondary)]">
            <span className="text-xs font-medium">API Contracts</span>
            <Code2 size={16} className="text-[var(--color-primary)]" />
          </div>
          <div className="mt-2">
            <p className="font-display text-2xl font-bold text-[var(--color-text-primary)]">
              {contracts.contracts?.length || 0}
            </p>
            <p className="text-[11px] text-[var(--color-text-secondary)]">
              Across {contracts.services?.length || 0} service(s)
            </p>
          </div>
        </Card>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-[var(--color-border)] gap-1 overflow-x-auto text-sm font-medium">
        {[
          { id: "overview", label: "Overview & Activity", icon: Activity },
          { id: "stories", label: `Stories (${stories.length})`, icon: BookOpen },
          { id: "knowledge", label: `Knowledge Base (${knowledge.length})`, icon: Layers },
          { id: "contracts", label: `API Contracts (${contracts.contracts?.length || 0})`, icon: Code2 },
          { id: "workflows", label: `Workflows (${workflows.length})`, icon: GitBranch },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as ActiveTab)}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-medium transition-colors whitespace-nowrap ${
                isActive
                  ? "border-[var(--color-primary)] text-[var(--color-primary)] font-semibold"
                  : "border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              <Icon size={15} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {/* OVERVIEW TAB */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Col: Recent Stories & Workflows */}
            <div className="lg:col-span-2 space-y-6">
              {/* Recent Stories Card */}
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-display text-sm font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
                    <BookOpen size={16} className="text-[var(--color-primary)]" /> User Stories Overview
                  </h3>
                  <button
                    onClick={() => setActiveTab("stories")}
                    className="text-xs text-[var(--color-primary)] hover:underline font-medium"
                  >
                    View All Stories →
                  </button>
                </div>

                {stories.length === 0 ? (
                  <p className="text-xs text-[var(--color-text-secondary)] py-4 text-center">
                    No user stories created yet for this project.
                  </p>
                ) : (
                  <div className="divide-y divide-[var(--color-border)]">
                    {stories.slice(0, 4).map((s) => (
                      <div key={s.uuid} className="py-3 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">{s.title}</p>
                          <div className="flex items-center gap-2 mt-0.5 text-xs text-[var(--color-text-secondary)]">
                            <span className="font-mono text-[var(--color-primary)] font-semibold">{s.external_key}</span>
                            <span>·</span>
                            <span>{s.sprint || "Sprint 1"}</span>
                            <span>·</span>
                            <span>Coverage: {Math.round(s.coverage_pct || 0)}%</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {s.workflow_id ? (
                            <Button
                              variant="secondary"
                              onClick={() => navigate(`/app/workflows/${s.workflow_id}${project?.uuid ? `?project=${project.uuid}` : ""}`)}
                              className="text-xs shrink-0 py-1 px-2.5 h-7 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10 font-semibold"
                            >
                              <GitBranch size={12} /> View Workflow
                            </Button>
                          ) : (
                            <Button
                              variant="secondary"
                              onClick={() => navigate(`/app/new-workflow?story=${s.uuid}${project?.uuid ? `&project=${project.uuid}` : ""}`)}
                              className="text-xs shrink-0 py-1 px-2.5 h-7"
                            >
                              <Play size={12} /> Run TDD
                            </Button>
                          )}
                          <button
                            type="button"
                            title="Delete story"
                            onClick={() => {
                              setDeleteStoryError(null);
                              setStoryToDelete(s);
                            }}
                            className="rounded p-1 text-zinc-400 hover:bg-rose-500/10 hover:text-rose-400 transition-colors"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent Workflows Card */}
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-display text-sm font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
                    <GitBranch size={16} className="text-[var(--color-primary)]" /> Recent TDD Workflow Runs
                  </h3>
                  <button
                    onClick={() => setActiveTab("workflows")}
                    className="text-xs text-[var(--color-primary)] hover:underline font-medium"
                  >
                    View All Workflows →
                  </button>
                </div>

                {workflows.length === 0 ? (
                  <p className="text-xs text-[var(--color-text-secondary)] py-4 text-center">
                    No workflows generated yet for this project.
                  </p>
                ) : (
                  <div className="divide-y divide-[var(--color-border)]">
                    {workflows.slice(0, 4).map((w) => (
                      <Link
                        key={w.workflow_id}
                        to={`/app/workflows/${w.workflow_id}${project?.uuid ? `?project=${project.uuid}` : ""}`}
                        className="py-3 flex items-center justify-between gap-3 hover:bg-[var(--color-surface-elevated)]/40 px-2 rounded-lg transition-colors"
                      >
                        <div>
                          <p className="text-sm font-medium text-[var(--color-text-primary)]">
                            {w.story_title || `Workflow ${w.workflow_id.slice(0, 8)}`}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5 text-xs text-[var(--color-text-secondary)]">
                            <span className="font-mono">{w.current_stage?.replace(/_/g, " ")}</span>
                            {w.created_at && (
                              <>
                                <span>·</span>
                                <span>{new Date(w.created_at).toLocaleDateString()}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <StatusBadge status={w.status} />
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right Col: Stack & VCS Details */}
            <div className="space-y-6">
              {/* Stack Architecture Card */}
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
                <h3 className="font-display text-sm font-semibold text-[var(--color-text-primary)] mb-3 flex items-center gap-2">
                  <Server size={16} className="text-[var(--color-primary)]" /> Stack & Architecture
                </h3>
                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between py-1 border-b border-[var(--color-border)]">
                    <span className="text-[var(--color-text-secondary)]">Target Language:</span>
                    <span className="font-semibold text-[var(--color-text-primary)] uppercase">{project.target_language || "Java"}</span>
                  </div>
                  {project.backend_framework && (
                    <div className="flex justify-between py-1 border-b border-[var(--color-border)]">
                      <span className="text-[var(--color-text-secondary)]">Backend Framework:</span>
                      <span className="font-semibold text-[var(--color-text-primary)]">{project.backend_framework}</span>
                    </div>
                  )}
                  {project.frontend_framework && (
                    <div className="flex justify-between py-1 border-b border-[var(--color-border)]">
                      <span className="text-[var(--color-text-secondary)]">Frontend Framework:</span>
                      <span className="font-semibold text-[var(--color-primary)]">{project.frontend_framework}</span>
                    </div>
                  )}
                  {project.testing_framework && (
                    <div className="flex justify-between py-1 border-b border-[var(--color-border)]">
                      <span className="text-[var(--color-text-secondary)]">Testing Framework:</span>
                      <span className="font-semibold text-[var(--color-text-primary)]">{project.testing_framework}</span>
                    </div>
                  )}
                  {project.app_type && (
                    <div className="flex justify-between py-1 border-b border-[var(--color-border)]">
                      <span className="text-[var(--color-text-secondary)]">Application Type:</span>
                      <span className="font-medium text-[var(--color-text-primary)]">{project.app_type}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* GitHub & VCS Card */}
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-display text-sm font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
                    <GitBranch size={16} className="text-[var(--color-primary)]" /> GitHub & VCS Integration
                  </h3>
                  {project.git_repo_url && (
                    <button
                      type="button"
                      onClick={handleTestGitConnection}
                      disabled={testingGit}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-2.5 py-1 text-xs font-medium text-[var(--color-text-primary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] disabled:opacity-50 transition-all shadow-sm"
                    >
                      {testingGit ? (
                        <>
                          <Loader2 size={12} className="animate-spin text-[var(--color-primary)]" />
                          Testing...
                        </>
                      ) : (
                        <>
                          <Plug size={12} className="text-[var(--color-primary)]" />
                          Test Connection
                        </>
                      )}
                    </button>
                  )}
                </div>

                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between py-1 border-b border-[var(--color-border)]">
                    <span className="text-[var(--color-text-secondary)]">Provider:</span>
                    <span className="font-semibold text-[var(--color-text-primary)]">GitHub</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[var(--color-border)]">
                    <span className="text-[var(--color-text-secondary)]">Default Branch:</span>
                    <span className="font-mono text-[var(--color-primary)]">{project.git_branch || "main"}</span>
                  </div>
                  {project.git_repo_url ? (
                    <div className="pt-1 border-b border-[var(--color-border)] pb-2">
                      <span className="text-[var(--color-text-secondary)] block mb-1">Repository URL:</span>
                      <a
                        href={project.git_repo_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-[11px] text-[var(--color-primary)] break-all hover:underline inline-flex items-center gap-1"
                      >
                        {project.git_repo_url}
                        <ExternalLink size={10} />
                      </a>
                    </div>
                  ) : (
                    <div className="py-2 text-[var(--color-text-secondary)] italic">
                      No repository URL specified for this project.
                    </div>
                  )}

                  {/* Connectivity Status Display */}
                  <div className="pt-1">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[var(--color-text-secondary)]">Connection Status:</span>
                      {testingGit ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-[11px] font-medium text-blue-400 border border-blue-500/20">
                          <Loader2 size={10} className="animate-spin" /> Verifying...
                        </span>
                      ) : gitResult ? (
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium border ${
                            gitResult.connected
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                              : "bg-rose-500/10 text-rose-400 border-rose-500/30"
                          }`}
                        >
                          {gitResult.connected ? (
                            <>
                              <CheckCircle2 size={11} /> Connected
                            </>
                          ) : (
                            <>
                              <AlertCircle size={11} /> Connection Failed
                            </>
                          )}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-surface-elevated)] px-2 py-0.5 text-[11px] text-[var(--color-text-secondary)] border border-[var(--color-border)]">
                          Ready to Test
                        </span>
                      )}
                    </div>

                    {gitResult && !testingGit && (
                      <div
                        className={`mt-2 rounded-lg border p-2.5 text-xs transition-all ${
                          gitResult.connected
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                            : "border-rose-500/30 bg-rose-500/10 text-rose-300"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <p className="text-[11px] leading-relaxed opacity-90">{gitResult.message}</p>
                          {gitResult.latency_ms !== undefined && gitResult.latency_ms > 0 && (
                            <span className="font-mono text-[10px] opacity-80 shrink-0 ml-2">
                              {gitResult.latency_ms}ms
                            </span>
                          )}
                        </div>
                        {gitResult.connected && gitResult.repo && (
                          <div className="flex items-center gap-2 pt-1 font-mono text-[10px] opacity-80">
                            <span>Repo: {gitResult.repo}</span>
                            <span>•</span>
                            <span>Branch: {gitResult.branch}</span>
                            {gitResult.is_private !== undefined && (
                              <>
                                <span>•</span>
                                <span>{gitResult.is_private ? "Private" : "Public"}</span>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STORIES TAB */}
        {activeTab === "stories" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-base font-semibold text-[var(--color-text-primary)]">User Stories</h2>
                <p className="text-xs text-[var(--color-text-secondary)]">Manage stories, acceptance criteria, and launch test generation workflows</p>
              </div>
              <Button onClick={() => setCreateStoryOpen(true)} className="flex items-center gap-1.5 text-xs">
                <Plus size={14} /> Add Story
              </Button>
            </div>

            {stories.length === 0 ? (
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center">
                <BookOpen size={32} className="mx-auto text-[var(--color-text-secondary)] mb-2" />
                <h3 className="font-display text-sm font-semibold text-[var(--color-text-primary)]">No stories yet in this project</h3>
                <p className="text-xs text-[var(--color-text-secondary)] mt-1 mb-4">Create your first user story to generate test cases and evidence.</p>
                <Button onClick={() => setCreateStoryOpen(true)} className="text-xs">
                  <Plus size={14} /> Create User Story
                </Button>
              </div>
            ) : (
              <div className="grid gap-3">
                {stories.map((s) => (
                  <Card key={s.uuid} className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-[var(--color-primary)]">{s.external_key}</span>
                        <h4 className="font-display font-semibold text-[var(--color-text-primary)] text-sm">{s.title}</h4>
                      </div>
                      {s.description && (
                        <p className="text-xs text-[var(--color-text-secondary)] line-clamp-2">{s.description}</p>
                      )}
                      <div className="flex items-center gap-3 text-xs text-[var(--color-text-secondary)] pt-1">
                        <span>Sprint: {s.sprint || "Sprint 1"}</span>
                        <span>·</span>
                        <span>Coverage: {Math.round(s.coverage_pct || 0)}%</span>
                        {s.acceptance_criteria && (
                          <>
                            <span>·</span>
                            <span>{s.acceptance_criteria.length} Acceptance Criteria</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {s.workflow_id ? (
                        <Button
                          onClick={() => navigate(`/app/workflows/${s.workflow_id}${project?.uuid ? `?project=${project.uuid}` : ""}`)}
                          className="flex items-center gap-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm"
                        >
                          <GitBranch size={13} /> View Workflow
                        </Button>
                      ) : (
                        <Button
                          onClick={() => navigate(`/app/new-workflow?story=${s.uuid}${project?.uuid ? `&project=${project.uuid}` : ""}`)}
                          className="flex items-center gap-1.5 text-xs font-semibold"
                        >
                          <Play size={13} /> Run TDD Workflow
                        </Button>
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
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* KNOWLEDGE TAB */}
        {activeTab === "knowledge" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-base font-semibold text-[var(--color-text-primary)]">Project Knowledge Base & RAG</h2>
                <p className="text-xs text-[var(--color-text-secondary)]">Domain documents, API contracts, coding standards, and vector search</p>
              </div>
              <Button onClick={() => navigate(`/app/knowledge?project=${project.uuid}`)} className="flex items-center gap-1.5 text-xs">
                <UploadCloud size={14} /> Upload / Manage Docs
              </Button>
            </div>

            {/* Live RAG Query Sandbox */}
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
              <h3 className="font-display text-sm font-semibold text-[var(--color-text-primary)] mb-2 flex items-center gap-2">
                <Sparkles size={16} className="text-[var(--color-primary)]" /> Live Project RAG Retrieval Test
              </h3>
              <p className="text-xs text-[var(--color-text-secondary)] mb-4">
                Execute isolated semantic retrieval against this project's indexed knowledge base chunks.
              </p>

              <form onSubmit={handleRagSearch} className="flex gap-2 mb-4">
                <input
                  type="text"
                  placeholder="e.g. Find acceptance rules for checkout or retry timeout limits..."
                  value={ragQuery}
                  onChange={(e) => setRagQuery(e.target.value)}
                  className="flex-1 rounded-[10px] border border-[var(--color-border)] bg-[var(--color-input)] px-3.5 py-2 text-xs text-[var(--color-text-primary)] shadow-[var(--shadow-neu-inset)] outline-none focus:border-[var(--color-border-orange)]"
                />
                <Button type="submit" loading={ragLoading} className="text-xs shrink-0 flex items-center gap-1.5">
                  <Search size={14} /> Query RAG
                </Button>
              </form>

              {ragResults.length > 0 && (
                <div className="space-y-2.5 mt-3 pt-3 border-t border-[var(--color-border)]">
                  <span className="text-xs font-semibold text-[var(--color-primary)]">Retrieved Chunks:</span>
                  {ragResults.map((chunk, idx) => (
                    <div key={idx} className="rounded-lg bg-[var(--color-surface-elevated)] p-3 text-xs space-y-1">
                      <p className="text-[var(--color-text-primary)]">{chunk.content}</p>
                      {chunk.source && <p className="font-mono text-[10px] text-[var(--color-text-secondary)]">Source: {chunk.source}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Document List */}
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
              <h3 className="font-display text-sm font-semibold text-[var(--color-text-primary)] mb-3">
                Indexed Documents ({knowledge.length})
              </h3>
              {knowledge.length === 0 ? (
                <p className="text-xs text-[var(--color-text-secondary)] py-4 text-center">
                  No knowledge documents indexed for this project yet.
                </p>
              ) : (
                <div className="divide-y divide-[var(--color-border)]">
                  {knowledge.map((doc) => (
                    <div key={doc.uuid} className="py-3 flex items-center justify-between gap-3 text-xs">
                      <div>
                        <p className="font-semibold text-[var(--color-text-primary)]">{doc.title}</p>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-[var(--color-text-secondary)]">
                          <span className="rounded bg-[var(--color-surface-elevated)] px-1.5 py-0.2">{doc.doc_type}</span>
                          <span>·</span>
                          <span>{doc.chunk_count} chunk(s)</span>
                          <span>·</span>
                          <span>Status: {doc.index_status}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* CONTRACTS TAB */}
        {activeTab === "contracts" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-base font-semibold text-[var(--color-text-primary)]">API Contracts & Services</h2>
                <p className="text-xs text-[var(--color-text-secondary)]">OpenAPI endpoints, service catalogues, and schema definitions</p>
              </div>
            </div>

            {contracts.contracts?.length === 0 ? (
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center">
                <Code2 size={32} className="mx-auto text-[var(--color-text-secondary)] mb-2" />
                <h3 className="font-display text-sm font-semibold text-[var(--color-text-primary)]">No API contracts registered yet</h3>
                <p className="text-xs text-[var(--color-text-secondary)] mt-1">Upload Postman / Bruno collections in Knowledge Base to auto-import contracts.</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {contracts.contracts?.map((c) => (
                  <Card key={c.uuid} className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-mono text-xs">
                        <span
                          className={`rounded px-1.5 py-0.5 font-bold ${
                            c.method === "GET"
                              ? "bg-blue-500/10 text-blue-500"
                              : c.method === "POST"
                              ? "bg-green-500/10 text-green-500"
                              : c.method === "DELETE"
                              ? "bg-red-500/10 text-red-500"
                              : "bg-amber-500/10 text-amber-500"
                          }`}
                        >
                          {c.method}
                        </span>
                        <span className="font-semibold text-[var(--color-text-primary)]">{c.path}</span>
                      </div>
                      {c.service_name && (
                        <span className="rounded bg-[var(--color-surface-elevated)] border border-[var(--color-border)] px-2 py-0.5 text-[11px] text-[var(--color-text-secondary)]">
                          {c.service_name}
                        </span>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* WORKFLOWS TAB */}
        {activeTab === "workflows" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-base font-semibold text-[var(--color-text-primary)]">TDD Workflow Runs</h2>
                <p className="text-xs text-[var(--color-text-secondary)]">History of all autonomous TDD test generation pipelines</p>
              </div>
              <Button onClick={() => navigate(`/app/new-workflow?project=${project.uuid}`)} className="flex items-center gap-1.5 text-xs">
                <Plus size={14} /> New Workflow
              </Button>
            </div>

            {workflows.length === 0 ? (
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center">
                <GitBranch size={32} className="mx-auto text-[var(--color-text-secondary)] mb-2" />
                <h3 className="font-display text-sm font-semibold text-[var(--color-text-primary)]">No workflow runs yet</h3>
                <p className="text-xs text-[var(--color-text-secondary)] mt-1 mb-4">Launch a new autonomous TDD generation workflow for this project.</p>
                <Button onClick={() => navigate(`/app/new-workflow?project=${project.uuid}`)} className="text-xs">
                  <Plus size={14} /> Start Workflow
                </Button>
              </div>
            ) : (
              <div className="grid gap-2.5">
                {workflows.map((w) => (
                  <Link
                    key={w.workflow_id}
                    to={`/app/workflows/${w.workflow_id}?project=${project.uuid}`}
                    className="block"
                  >
                    <Card className="flex items-center justify-between p-4 hover:border-[var(--color-primary)] transition-all">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-[var(--color-primary)] font-bold">{w.story_key || w.workflow_id.slice(0, 8)}</span>
                          <span className="font-semibold text-sm text-[var(--color-text-primary)]">{w.story_title || "Autonomous TDD Run"}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-xs text-[var(--color-text-secondary)]">
                          <span className="font-mono">{w.current_stage?.replace(/_/g, " ")}</span>
                          {w.created_at && (
                            <>
                              <span>·</span>
                              <span>{new Date(w.created_at).toLocaleString()}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <StatusBadge status={w.status} />
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

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

      {/* Create Story Modal */}
      {createStoryOpen && (
        <CreateStoryModal
          isOpen={createStoryOpen}
          projects={project ? [project] : []}
          defaultProjectUuid={project.uuid}
          onClose={() => setCreateStoryOpen(false)}
          onSuccess={loadProjectData}
        />
      )}
    </div>
  );
}
