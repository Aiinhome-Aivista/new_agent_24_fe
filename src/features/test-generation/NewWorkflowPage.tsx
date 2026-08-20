import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { storyApi } from "@/services/api/storyApi";
import { projectApi } from "@/services/api/projectApi";
import { workflowApi } from "@/services/api/workflowApi";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Loading } from "@/components/ui/Loading";
import { useToast } from "@/contexts/ToastContext";
import type { Story, Project } from "@/types";
import { Check, ShieldCheck, ArrowRight, Layers, Sparkles, GitBranch, AlertCircle } from "lucide-react";

const CAPABILITIES = [
  "Requirement Analysis",
  "Service Analysis",
  "Test Planning",
  "Test Generation",
  "Code Generation",
  "API Execution",
  "Code Validation",
  "Evidence Generation",
  "ALM Attachment",
];

export function NewWorkflowPage() {
  const [params] = useSearchParams();
  const preselectStory = params.get("story") ?? "";
  const preselectProject = params.get("project") ?? "";
  const navigate = useNavigate();
  const { notify } = useToast();

  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>(preselectProject);
  const [stories, setStories] = useState<Story[]>([]);
  const [storyUuid, setStoryUuid] = useState(preselectStory);
  const [caps, setCaps] = useState<string[]>(CAPABILITIES);
  const [starting, setStarting] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load projects, stories, and workflows
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [pRes, sRes, wRes] = await Promise.all([
          projectApi.list(),
          storyApi.list(selectedProject || undefined),
          workflowApi.list(),
        ]);
        setProjects(pRes.projects ?? []);

        // Map existing workflows by story
        const storyWfMap = new Map<string, { workflow_id: string; status: string; current_stage: string }>();
        (wRes.workflows ?? []).forEach((w) => {
          if (w.story_id) storyWfMap.set(String(w.story_id), { workflow_id: w.workflow_id, status: w.status, current_stage: w.current_stage });
          if (w.story_key) storyWfMap.set(w.story_key, { workflow_id: w.workflow_id, status: w.status, current_stage: w.current_stage });
          if (w.story_title) storyWfMap.set(w.story_title, { workflow_id: w.workflow_id, status: w.status, current_stage: w.current_stage });
        });

        const enrichedStories = (sRes.stories ?? []).map((s) => {
          const match = s.workflow_id
            ? { workflow_id: s.workflow_id, status: s.workflow_status || "RUNNING", current_stage: s.workflow_stage || "CREATED" }
            : (s.external_key ? storyWfMap.get(s.external_key) : null) || storyWfMap.get(s.title);

          return {
            ...s,
            workflow_id: match?.workflow_id || s.workflow_id,
            workflow_status: match?.status || s.workflow_status,
            workflow_stage: match?.current_stage || s.workflow_stage,
          };
        });

        setStories(enrichedStories);

        // If preselected story is found, ensure its project is set
        if (preselectStory && enrichedStories.length > 0) {
          const match = enrichedStories.find((s) => s.uuid === preselectStory);
          if (match?.project_uuid && !selectedProject) {
            setSelectedProject(match.project_uuid);
          }
        }
      } catch (err) {
        notify("error", (err as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, [selectedProject]);

  const toggle = (c: string) =>
    setCaps((cur) => (cur.includes(c) ? cur.filter((x) => x !== c) : [...cur, c]));

  const selectedStoryObj = stories.find((s) => s.uuid === storyUuid);
  const selectedStoryHasWorkflow = Boolean(selectedStoryObj?.workflow_id);
  const projUuid = selectedStoryObj?.project_uuid || selectedProject;

  const start = async () => {
    if (!storyUuid) {
      notify("error", "Select a user story first");
      return;
    }
    if (selectedStoryHasWorkflow) {
      notify("error", "A workflow already exists for this story. Only one workflow per story is permitted.");
      return;
    }
    setStarting(true);
    try {
      const res = await workflowApi.start(storyUuid, caps);
      notify("success", `Workflow initiated (${res.status})`);
      navigate(`/app/workflows/${res.workflow_id}${projUuid ? `?project=${projUuid}` : ""}`);
    } catch (e) {
      notify("error", (e as Error).message);
    } finally {
      setStarting(false);
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-[var(--color-text-primary)]">
            New TDD Workflow
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Select a story, configure capabilities, and launch an autonomous test generation pipeline.
          </p>
        </div>

        {/* Project Filter */}
        {projects.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--color-text-secondary)]">Project:</span>
            <select
              value={selectedProject}
              onChange={(e) => {
                setSelectedProject(e.target.value);
                setStoryUuid("");
              }}
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
      </div>

      <Card className="mb-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
            1 · Target User Story
          </h2>
          <Link
            to={`/app/stories${selectedProject ? `?project=${selectedProject}` : ""}`}
            className="text-xs text-[var(--color-primary)] hover:underline flex items-center gap-1"
          >
            Manage Stories <ArrowRight size={12} />
          </Link>
        </div>

        {stories.length === 0 ? (
          <div className="p-4 text-center text-xs text-[var(--color-text-secondary)]">
            No user stories found in this project. Create a user story first.
          </div>
        ) : (
          <div className="flex flex-col gap-2.5 max-h-80 overflow-y-auto pr-1">
            {stories.map((s) => {
              const isSelected = storyUuid === s.uuid;
              const hasWf = Boolean(s.workflow_id);
              return (
                <div
                  key={s.uuid}
                  onClick={() => setStoryUuid(s.uuid)}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border p-3.5 text-left transition-all cursor-pointer ${
                    isSelected
                      ? hasWf
                        ? "border-amber-500 bg-amber-500/10 ring-1 ring-amber-500/30"
                        : "border-[var(--color-primary)] bg-[var(--color-primary)]/5 ring-1 ring-[var(--color-primary)]/30"
                      : hasWf
                        ? "border-[var(--color-border)] bg-[var(--color-surface-elevated)]/30 hover:border-amber-500/50"
                        : "border-[var(--color-border)] hover:border-[var(--color-border-orange)]/60 bg-[var(--color-surface-elevated)]/50"
                  }`}
                >
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-mono text-xs font-semibold text-[var(--color-primary)] bg-[var(--color-primary)]/10 px-1.5 py-0.2 rounded">
                        {s.external_key}
                      </span>
                      {s.project_key && (
                        <span className="font-mono text-[10px] text-[var(--color-text-secondary)] border border-[var(--color-border)] px-1 rounded">
                          {s.project_key}
                        </span>
                      )}
                      <span className="text-xs font-semibold text-[var(--color-text-primary)] truncate">
                        {s.title}
                      </span>
                      {hasWf ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-400">
                          <GitBranch size={10} /> Workflow Started
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[9px] font-semibold text-emerald-400">
                          Ready for TDD
                        </span>
                      )}
                    </div>
                    {s.description && (
                      <p className="line-clamp-1 text-[11px] text-[var(--color-text-secondary)]">
                        {s.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    {hasWf && (
                      <Link
                        to={`/app/workflows/${s.workflow_id}${selectedProject || s.project_uuid ? `?project=${selectedProject || s.project_uuid}` : ""}`}
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 px-2.5 py-1 rounded-lg transition-colors"
                      >
                        <GitBranch size={11} /> View Workflow <ArrowRight size={10} />
                      </Link>
                    )}
                    {isSelected && (
                      <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white ${hasWf ? "bg-amber-500" : "bg-[var(--color-primary)]"}`}>
                        <Check size={14} />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Existing Workflow Notice if selected story already has one */}
      {selectedStoryHasWorkflow && selectedStoryObj && (
        <div className="mb-4 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400 mt-0.5">
              <AlertCircle size={18} />
            </div>
            <div>
              <p className="text-xs font-semibold text-[var(--color-text-primary)]">
                Workflow already exists for this story
              </p>
              <p className="text-[11px] text-[var(--color-text-secondary)] mt-0.5">
                Story <span className="font-mono font-medium text-[var(--color-text-primary)]">{selectedStoryObj.external_key}</span> has a workflow (ID: <span className="font-mono">{selectedStoryObj.workflow_id?.slice(0, 8)}…</span>). Each story can only have one workflow.
              </p>
            </div>
          </div>
          <Link
            to={`/app/workflows/${selectedStoryObj.workflow_id}${projUuid ? `?project=${projUuid}` : ""}`}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3 py-2 text-xs font-semibold text-white shadow-sm transition-colors shrink-0"
          >
            <GitBranch size={13} /> View Workflow <ArrowRight size={12} />
          </Link>
        </div>
      )}

      <Card className="mb-4">
        <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
          2 · Agent Capabilities & Pipeline Stages
        </h2>
        <div className="flex flex-wrap gap-2">
          {CAPABILITIES.map((c) => {
            const isEnabled = caps.includes(c);
            return (
              <button
                key={c}
                type="button"
                onClick={() => toggle(c)}
                className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all ${
                  isEnabled
                    ? "border-[var(--color-primary)] bg-[var(--color-primary)]/15 text-[var(--color-primary)] shadow-sm"
                    : "border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                }`}
              >
                {c}
              </button>
            );
          })}
        </div>
      </Card>

      {/* Human Governance Guarantee Banner */}
      <div className="mb-5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 flex items-start gap-3">
        <ShieldCheck size={20} className="text-amber-400 shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <p className="font-semibold text-[var(--color-text-primary)]">
            Human-in-the-Loop Governance Checkpoints
          </p>
          <p className="text-[var(--color-text-secondary)] leading-relaxed">
            The pipeline will automatically pause at 3 mandatory checkpoints:{" "}
            <strong className="text-[var(--color-text-primary)]">Test Suite Review</strong>,{" "}
            <strong className="text-[var(--color-text-primary)]">Execution Evidence Review</strong>, and{" "}
            <strong className="text-[var(--color-text-primary)]">ALM Write-Back</strong>. Nothing is executed or committed without human approval.
          </p>
        </div>
      </div>

      <motion.div whileTap={{ scale: 0.99 }}>
        {selectedStoryHasWorkflow && selectedStoryObj ? (
          <Link
            to={`/app/workflows/${selectedStoryObj.workflow_id}${projUuid ? `?project=${projUuid}` : ""}`}
            className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white w-full py-3 text-sm font-semibold shadow-sm transition-colors"
          >
            <GitBranch size={16} /> View Existing Workflow ({selectedStoryObj.workflow_id?.slice(0, 8)}…)
          </Link>
        ) : (
          <Button onClick={start} loading={starting} disabled={!storyUuid || starting} className="w-full py-3 text-sm font-semibold">
            <Sparkles size={16} className="mr-1.5" /> Start TDD Workflow
          </Button>
        )}
      </motion.div>
    </div>
  );
}
