import { WORKFLOW_STAGES, HUMAN_CHECKPOINTS } from "@/constants/workflow";
import { motion } from "framer-motion";
import { UserCheck, Check, Loader2, ShieldAlert, CheckCircle2, XCircle } from "lucide-react";

export function WorkflowStepper({
  current,
  status,
  onApprove,
  onReject,
  isSubmitting,
}: {
  current: string;
  status?: string;
  onApprove?: () => void;
  onReject?: () => void;
  isSubmitting?: boolean;
}) {
  const currentIdx = WORKFLOW_STAGES.indexOf(current);
  const isCompleted =
    status === "COMPLETED" ||
    status === "APPROVED" ||
    (current === "DONE" && status !== "FAILED" && status !== "BLOCKED" && status !== "CANCELLED");
  const isWaiting =
    (status === "WAITING_FOR_REVIEW" || status === "WAITING_FOR_APPROVAL") && !isCompleted;

  return (
    <div className="flex flex-col gap-3">
      {/* Quick Action Banner in Stepper if Action is Required */}
      {isWaiting && onApprove && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 space-y-2.5 animate-in fade-in">
          <div className="flex items-center gap-2">
            <ShieldAlert size={16} className="text-amber-400 animate-pulse shrink-0" />
            <span className="text-xs font-bold text-amber-300">
              Human Sign-Off Required
            </span>
          </div>
          <p className="text-[11px] text-[var(--color-text-secondary)] leading-tight">
            Pipeline paused at <strong>{current.replace(/_/g, " ")}</strong>. Authorize to proceed.
          </p>
          <div className="flex items-center gap-1.5 pt-1">
            <button
              type="button"
              onClick={onApprove}
              disabled={isSubmitting}
              className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-[var(--color-primary)] px-2 py-1.5 text-[11px] font-bold text-white shadow hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              <CheckCircle2 size={12} />
              <span>Approve</span>
            </button>
            {onReject && (
              <button
                type="button"
                onClick={onReject}
                disabled={isSubmitting}
                className="flex items-center justify-center gap-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1.5 text-[11px] font-semibold text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
              >
                <XCircle size={12} />
                <span>Reject</span>
              </button>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        {WORKFLOW_STAGES.map((stage, i) => {
          const isCurrentStage = i === currentIdx;
          const isPastStage = i < currentIdx;
          const done = isCompleted ? (isPastStage || isCurrentStage) : isPastStage;
          const active = !isCompleted && isCurrentStage;
          const isCheckpoint = HUMAN_CHECKPOINTS.has(stage);
          const isActionRequired = active && (isCheckpoint || isWaiting);

          return (
            <div
              key={stage}
              className={`flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors ${
                isActionRequired
                  ? "bg-amber-500/10 border border-amber-500/30"
                  : isCompleted && stage === "DONE"
                  ? "bg-emerald-500/10 border border-emerald-500/30"
                  : active
                  ? "bg-[var(--color-surface-elevated)]"
                  : ""
              }`}
            >
              <div
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] transition-all ${
                  isActionRequired
                    ? "border-amber-500 bg-amber-500/20 text-amber-400 ring-2 ring-amber-500/30 animate-pulse"
                    : done
                    ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
                    : active
                    ? "border-[var(--color-primary)] text-[var(--color-primary)] bg-[var(--color-primary)]/10"
                    : "border-[var(--color-border)] text-[var(--color-text-secondary)]"
                }`}
              >
                {done ? (
                  <Check size={13} />
                ) : isActionRequired ? (
                  <ShieldAlert size={13} className="animate-pulse" />
                ) : active ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : isCheckpoint ? (
                  <UserCheck size={12} />
                ) : (
                  i + 1
                )}
              </div>

              <div className="flex flex-1 items-center justify-between min-w-0">
                <motion.span
                  animate={{ opacity: active || done ? 1 : 0.5 }}
                  className="text-xs truncate"
                  style={{
                    color: isActionRequired
                      ? "var(--color-warning)"
                      : active || done
                      ? "var(--color-text-primary)"
                      : "var(--color-text-secondary)",
                    fontWeight: active || done ? 600 : 400,
                  }}
                >
                  {stage.replace(/_/g, " ")}
                </motion.span>

                {isActionRequired ? (
                  <span className="shrink-0 rounded bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-400 animate-pulse">
                    Action Required
                  </span>
                ) : isCompleted && stage === "DONE" ? (
                  <span className="shrink-0 rounded bg-emerald-500/20 border border-emerald-500/40 px-1.5 py-0.2 text-[9px] font-bold uppercase tracking-wider text-emerald-400">
                    Complete
                  </span>
                ) : isCheckpoint ? (
                  <span className="shrink-0 rounded bg-[var(--color-surface-elevated)] border border-[var(--color-border)] px-1 py-0.2 text-[9px] font-medium text-[var(--color-primary)]">
                    Gate
                  </span>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

