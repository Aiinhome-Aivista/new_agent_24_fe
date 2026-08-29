import { useState, useEffect } from "react";
import { usePolling } from "@/hooks/usePolling";
import { approvalApi } from "@/services/api/approvalApi";
import { projectApi } from "@/services/api/projectApi";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Loading, ErrorState } from "@/components/ui/Loading";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/contexts/ToastContext";
import { Link, useSearchParams } from "react-router-dom";
import type { Approval, Project } from "@/types";
import {
  ShieldAlert,
  CheckCircle2,
  XCircle,
  RotateCcw,
  RefreshCw,
  ExternalLink,
  MessageSquare,
} from "lucide-react";

export function ApprovalsPage() {
  const [params, setParams] = useSearchParams();
  const selectedProject = params.get("project") ?? "";
  const { notify } = useToast();
  const [comments, setComments] = useState<Record<string, string>>({});
  const [submittingUuid, setSubmittingUuid] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [projects, setProjects] = useState<Project[]>([]);

  // Poll pending approvals gently every 10s
  const pollingData = usePolling(() => approvalApi.pending(), 10000, true);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    projectApi
      .list()
      .then((res) => setProjects(res.projects ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    approvalApi
      .pending()
      .then((res) => setApprovals(res.approvals ?? []))
      .finally(() => setLoading(false));
  }, [tick]);

  useEffect(() => {
    if (pollingData?.approvals) {
      setApprovals(pollingData.approvals);
    }
  }, [pollingData]);

  const handleProjectFilter = (pUuid: string) => {
    if (pUuid) {
      setParams({ project: pUuid });
    } else {
      setParams({});
    }
  };

  const displayedApprovals = selectedProject
    ? approvals.filter((a) => a.project_uuid === selectedProject)
    : approvals;

  const decide = async (a: Approval, decision: string) => {
    setSubmittingUuid(a.uuid);
    const comment = comments[a.uuid] || "";
    try {
      await approvalApi.decide(a.uuid, decision, comment);
      notify("success", `${a.stage.replace(/_/g, " ")}: recorded ${decision.toLowerCase()}`);
      setComments((prev) => {
        const next = { ...prev };
        delete next[a.uuid];
        return next;
      });
      setTick((t) => t + 1);
    } catch (e) {
      notify("error", (e as Error).message);
    } finally {
      setSubmittingUuid(null);
    }
  };

  if (loading && approvals.length === 0) return <Loading />;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-[var(--color-text-primary)]">
            Human Approval Center
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Pending governance checkpoints requiring human verification before pipelines proceed.
          </p>
        </div>

        <Button
          variant="secondary"
          onClick={() => setTick((t) => t + 1)}
          className="flex items-center gap-1 text-xs py-1.5 px-3"
        >
          <RefreshCw size={13} /> Refresh
        </Button>
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

      {displayedApprovals.length === 0 ? (
        <EmptyState
          title={selectedProject ? "No pending approvals for this project" : "Nothing awaiting approval"}
          hint={selectedProject ? "There are currently no human checkpoints waiting for approval in this project." : "Human checkpoints will automatically appear here as autonomous workflows reach them."}
        />
      ) : (
        <div className="flex flex-col gap-4">
          {displayedApprovals.map((a) => {
            const isSubmitting = submittingUuid === a.uuid;
            const commentVal = comments[a.uuid] || "";
            const targetProj = selectedProject || a.project_uuid;
            const linkUrl = `/app/workflows/${a.workflow_id}${targetProj ? `?project=${targetProj}` : ""}`;

            return (
              <Card
                key={a.uuid}
                className="border-amber-500/40 bg-amber-500/5 p-5 space-y-4 shadow-sm hover:border-amber-500 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 mt-0.5">
                      <ShieldAlert size={18} className="animate-pulse" />
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        {a.project_key && (
                          <span className="rounded bg-[var(--color-surface-elevated)] border border-[var(--color-border)] px-1.5 py-0.2 font-mono text-[10px] font-bold text-[var(--color-primary)]">
                            {a.project_key}
                          </span>
                        )}
                        <h2 className="font-display text-sm font-semibold text-[var(--color-text-primary)]">
                          {a.stage.replace(/_/g, " ")}
                        </h2>
                        <span className="rounded-full bg-amber-500/20 px-2 py-0.2 text-[9px] font-bold uppercase text-amber-400">
                          Pending
                        </span>
                      </div>

                      {a.story_title && (
                        <p className="text-xs text-[var(--color-text-primary)] font-medium">
                          Story: {a.story_title}
                        </p>
                      )}

                      <div className="flex items-center gap-3 text-xs text-[var(--color-text-secondary)] mt-1">
                        <span>Workflow:</span>
                        <Link
                          to={linkUrl}
                          className="font-mono text-xs text-[var(--color-primary)] hover:underline flex items-center gap-1"
                        >
                          {a.workflow_id.slice(0, 8)}… <ExternalLink size={11} />
                        </Link>
                        <span>·</span>
                        <span>Requested: {new Date(a.requested_at).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Comment Input */}
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1 text-xs font-medium text-[var(--color-text-secondary)]">
                    <MessageSquare size={12} />
                    <span>Reviewer Note / Decision Reason:</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Enter review notes for the audit trail..."
                    value={commentVal}
                    onChange={(e) =>
                      setComments((prev) => ({ ...prev, [a.uuid]: e.target.value }))
                    }
                    className="w-full rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-2 text-xs text-[var(--color-text-primary)] focus:border-[var(--color-primary)] focus:outline-none"
                  />
                </div>

                {/* Decision Actions */}
                <div className="flex flex-wrap items-center justify-end gap-2.5 border-t border-[var(--color-border)] pt-3">
                  <Button
                    variant="secondary"
                    onClick={() => decide(a, "REJECTED")}
                    disabled={isSubmitting}
                    className="flex items-center gap-1.5 text-xs text-red-400 hover:bg-red-500/10"
                  >
                    <XCircle size={14} /> Reject
                  </Button>

                  <Button
                    variant="secondary"
                    onClick={() => decide(a, "CHANGES_REQUESTED")}
                    disabled={isSubmitting}
                    className="flex items-center gap-1.5 text-xs text-amber-400 hover:bg-amber-500/10"
                  >
                    <RotateCcw size={14} /> Request Changes
                  </Button>

                  <Button
                    onClick={() => decide(a, "APPROVED")}
                    loading={isSubmitting}
                    className="flex items-center gap-1.5 text-xs font-semibold"
                  >
                    <CheckCircle2 size={14} /> Approve & Continue
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
