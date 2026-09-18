import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { storyApi } from "@/services/api/storyApi";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/contexts/ToastContext";
import {
  generateStoryMarkdown,
  generateStoryJson,
  downloadBlob,
} from "./storyUtils";
import type { Story, AcceptanceCriterion } from "@/types";
import {
  X,
  Download,
  Copy,
  Check,
  FileText,
  FileJson,
  GitBranch,
  ArrowRight,
  CheckCircle2,
  Search,
  Loader2,
  BookOpen,
  Layers,
  Calendar,
  Percent,
} from "lucide-react";

interface Props {
  isOpen: boolean;
  story: Story | null;
  onClose: () => void;
}

export function ViewStoryModal({ isOpen, story, onClose }: Props) {
  const { notify } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fullStory, setFullStory] = useState<Story | null>(story);
  const [acs, setAcs] = useState<AcceptanceCriterion[]>([]);
  const [searchAc, setSearchAc] = useState("");
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedAcIdx, setCopiedAcIdx] = useState<number | null>(null);
  const [downloading, setDownloading] = useState<"md" | "json" | null>(null);

  useEffect(() => {
    if (!isOpen || !story) {
      setFullStory(null);
      setAcs([]);
      setError(null);
      setSearchAc("");
      return;
    }

    setFullStory(story);
    if (story.acceptance_criteria && story.acceptance_criteria.length > 0) {
      setAcs(story.acceptance_criteria);
    }

    const fetchDetail = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await storyApi.detail(story.uuid);
        if (res.story) {
          setFullStory(res.story);
        }
        setAcs(res.acceptance_criteria || []);
      } catch (err: any) {
        console.error("Failed to load story detail:", err);
        // If fetch fails, keep current story data but don't hard crash
        if (!story.acceptance_criteria || story.acceptance_criteria.length === 0) {
          setError(err?.message || "Failed to load full acceptance criteria");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [isOpen, story]);

  if (!isOpen || !story) return null;

  const currentStory = fullStory || story;
  const filteredAcs = acs.filter(
    (ac) =>
      ac.text.toLowerCase().includes(searchAc.toLowerCase()) ||
      (ac.ac_key || "").toLowerCase().includes(searchAc.toLowerCase())
  );

  const handleCopyMarkdown = async () => {
    try {
      const md = generateStoryMarkdown(currentStory, acs);
      await navigator.clipboard.writeText(md);
      setCopiedAll(true);
      notify("success", "Full story copied to clipboard as Markdown!");
      setTimeout(() => setCopiedAll(false), 2500);
    } catch {
      notify("error", "Failed to copy to clipboard.");
    }
  };

  const handleCopyAc = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedAcIdx(index);
      setTimeout(() => setCopiedAcIdx(null), 2000);
    } catch {
      notify("error", "Failed to copy acceptance criterion.");
    }
  };

  const handleDownload = (format: "md" | "json") => {
    setDownloading(format);
    try {
      const safeKey = (currentStory.external_key || currentStory.title || "story")
        .replace(/[^a-zA-Z0-9_-]/g, "_")
        .toLowerCase();

      if (format === "json") {
        const jsonContent = generateStoryJson(currentStory, acs);
        downloadBlob(jsonContent, `${safeKey}-story.json`, "application/json;charset=utf-8");
        notify("success", `Downloaded ${currentStory.external_key || "story"} as JSON`);
      } else {
        const mdContent = generateStoryMarkdown(currentStory, acs);
        downloadBlob(mdContent, `${safeKey}-story.md`, "text/markdown;charset=utf-8");
        notify("success", `Downloaded ${currentStory.external_key || "story"} as Markdown`);
      }
    } catch (err: any) {
      notify("error", `Failed to download: ${err?.message || "Unknown error"}`);
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div
        className="relative w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 p-5 border-b border-[var(--color-border)] bg-[var(--color-surface-elevated)]/30">
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-bold text-[var(--color-primary)] bg-[var(--color-primary)]/10 px-2.5 py-1 rounded-md border border-[var(--color-primary)]/20">
                {currentStory.external_key || "STORY"}
              </span>
              {currentStory.project_key && (
                <span className="text-xs font-mono font-medium text-[var(--color-text-secondary)] border border-[var(--color-border)] px-2 py-0.5 rounded-md bg-[var(--color-surface)]">
                  {currentStory.project_key}
                  {currentStory.project_name ? ` · ${currentStory.project_name}` : ""}
                </span>
              )}
              {currentStory.sprint && (
                <span className="flex items-center gap-1 text-xs text-[var(--color-text-secondary)] border border-[var(--color-border)] px-2 py-0.5 rounded-md bg-[var(--color-surface)]">
                  <Calendar size={11} /> {currentStory.sprint}
                </span>
              )}
              <StatusBadge status={(currentStory.status || "ready").toUpperCase()} />
              <span className="flex items-center gap-1 text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                <Percent size={11} /> Coverage: {Math.round(Number(currentStory.coverage_pct || 0))}%
              </span>
            </div>

            <h2 className="text-lg font-bold text-[var(--color-text-primary)] leading-tight pt-1">
              {currentStory.title}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-elevated)] transition-colors shrink-0"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-b border-[var(--color-border)] bg-[var(--color-surface-elevated)]/20">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => handleDownload("md")}
              disabled={downloading !== null}
              className="flex items-center gap-1.5 text-xs py-1.5 px-3 h-8"
              title="Download story and acceptance criteria as Markdown"
            >
              {downloading === "md" ? (
                <Loader2 size={13} className="animate-spin text-[var(--color-primary)]" />
              ) : (
                <FileText size={13} className="text-[var(--color-primary)]" />
              )}
              <span>Download .MD</span>
            </Button>

            <Button
              variant="secondary"
              onClick={() => handleDownload("json")}
              disabled={downloading !== null}
              className="flex items-center gap-1.5 text-xs py-1.5 px-3 h-8"
              title="Download structured story as JSON artifact"
            >
              {downloading === "json" ? (
                <Loader2 size={13} className="animate-spin text-emerald-400" />
              ) : (
                <FileJson size={13} className="text-emerald-400" />
              )}
              <span>Download .JSON</span>
            </Button>

            <Button
              variant="secondary"
              onClick={handleCopyMarkdown}
              className="flex items-center gap-1.5 text-xs py-1.5 px-3 h-8"
              title="Copy formatted markdown to clipboard"
            >
              {copiedAll ? (
                <>
                  <Check size={13} className="text-emerald-400" />
                  <span className="text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy size={13} />
                  <span>Copy Markdown</span>
                </>
              )}
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {currentStory.workflow_id ? (
              <Link
                to={`/app/workflows/${currentStory.workflow_id}${
                  currentStory.project_uuid ? `?project=${currentStory.project_uuid}` : ""
                }`}
                onClick={onClose}
                className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 px-3 py-1.5 rounded-[8px] transition-colors shadow-sm"
              >
                <GitBranch size={13} /> View Workflow <ArrowRight size={12} />
              </Link>
            ) : (
              <Link
                to={`/app/new-workflow?story=${currentStory.uuid}${
                  currentStory.project_uuid ? `?project=${currentStory.project_uuid}` : ""
                }`}
                onClick={onClose}
                className="flex items-center gap-1.5 text-xs font-medium text-[var(--color-primary)] bg-[var(--color-primary)]/10 hover:bg-[var(--color-primary)]/20 px-3 py-1.5 rounded-[8px] transition-colors"
              >
                Start TDD Workflow <ArrowRight size={13} />
              </Link>
            )}
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* User Story Description */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">
              <BookOpen size={14} className="text-[var(--color-primary)]" />
              <span>User Story Description</span>
            </div>
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)]/40 p-4 text-xs text-[var(--color-text-primary)] leading-relaxed whitespace-pre-wrap font-sans">
              {currentStory.description ? (
                currentStory.description
              ) : (
                <span className="text-[var(--color-text-secondary)] italic">
                  No description provided for this user story.
                </span>
              )}
            </div>
          </div>

          {/* Acceptance Criteria Section */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wider">
                  <CheckCircle2 size={14} className="text-emerald-400" />
                  <span>Acceptance Criteria</span>
                </div>
                <span className="inline-flex items-center px-2 py-0.5 text-xs font-bold font-mono rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/20">
                  {acs.length}
                </span>
                {loading && (
                  <span className="flex items-center gap-1 text-[11px] text-[var(--color-text-secondary)]">
                    <Loader2 size={12} className="animate-spin text-[var(--color-primary)]" />
                    Fetching criteria...
                  </span>
                )}
              </div>

              {acs.length > 2 && (
                <div className="relative w-48">
                  <Search size={13} className="absolute left-2.5 top-2.5 text-[var(--color-text-secondary)]" />
                  <input
                    type="text"
                    value={searchAc}
                    onChange={(e) => setSearchAc(e.target.value)}
                    placeholder="Search criteria..."
                    className="w-full pl-8 pr-2.5 py-1 text-xs rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] placeholder-[var(--color-text-secondary)]/60 focus:border-[var(--color-primary)] focus:outline-none"
                  />
                </div>
              )}
            </div>

            {error && (
              <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 p-3 text-xs text-rose-300">
                {error}
              </div>
            )}

            {filteredAcs.length === 0 ? (
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)]/20 p-6 text-center">
                <CheckCircle2 size={24} className="mx-auto text-[var(--color-text-secondary)]/60 mb-2" />
                <p className="text-xs text-[var(--color-text-secondary)]">
                  {searchAc ? "No acceptance criteria match your search." : "No acceptance criteria recorded for this story."}
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredAcs.map((ac, idx) => {
                  const acKey = ac.ac_key || `AC-${idx + 1}`;
                  const isCopied = copiedAcIdx === idx;
                  return (
                    <div
                      key={ac.uuid || idx}
                      className="group rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)]/40 hover:bg-[var(--color-surface-elevated)]/70 hover:border-[var(--color-border-orange)] transition-all p-3.5 flex items-start justify-between gap-3 shadow-sm"
                    >
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <span className="font-mono text-xs font-bold text-[var(--color-primary)] bg-[var(--color-primary)]/10 px-2 py-0.5 rounded border border-[var(--color-primary)]/20 shrink-0 mt-0.5">
                          {acKey}
                        </span>
                        <div className="text-xs text-[var(--color-text-primary)] leading-relaxed whitespace-pre-wrap break-words min-w-0 flex-1">
                          {ac.text}
                        </div>
                      </div>

                      <button
                        onClick={() => handleCopyAc(ac.text, idx)}
                        className="rounded-lg p-1.5 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface)] border border-transparent hover:border-[var(--color-border)] transition-colors shrink-0"
                        title="Copy criterion text"
                      >
                        {isCopied ? (
                          <Check size={13} className="text-emerald-400" />
                        ) : (
                          <Copy size={13} />
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Workflow Status Info Card (if present) */}
          {currentStory.workflow_id && (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                  <GitBranch size={14} />
                  <span>Autonomous TDD Workflow Attached</span>
                </div>
                <div className="text-xs text-[var(--color-text-secondary)] font-mono">
                  ID: {currentStory.workflow_id} · Stage: {currentStory.workflow_stage || "VALIDATING"} · Status:{" "}
                  {currentStory.workflow_status || "COMPLETED"}
                </div>
              </div>
              <Link
                to={`/app/workflows/${currentStory.workflow_id}${
                  currentStory.project_uuid ? `?project=${currentStory.project_uuid}` : ""
                }`}
                onClick={onClose}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 rounded-lg transition-colors shadow-sm shrink-0"
              >
                Inspect Results <ArrowRight size={12} />
              </Link>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-[var(--color-border)] bg-[var(--color-surface-elevated)]/30">
          <div className="text-[11px] text-[var(--color-text-secondary)] flex items-center gap-2">
            <span>UUID:</span>
            <span className="font-mono text-[10px] bg-[var(--color-surface)] px-1.5 py-0.5 rounded border border-[var(--color-border)]">
              {currentStory.uuid}
            </span>
          </div>

          <Button variant="secondary" onClick={onClose} className="text-xs px-4 py-1.5">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
