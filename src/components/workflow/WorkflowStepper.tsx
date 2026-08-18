import { WORKFLOW_STAGES, HUMAN_CHECKPOINTS } from "@/constants/workflow";
import { motion } from "framer-motion";
import { UserCheck, Check, Loader2, ShieldAlert } from "lucide-react";

export function WorkflowStepper({ current, status }: { current: string; status?: string }) {
  const currentIdx = WORKFLOW_STAGES.indexOf(current);
  const isWaiting = status === "WAITING_FOR_REVIEW" || status === "WAITING_FOR_APPROVAL";

  return (
    <div className="flex flex-col gap-1.5">
      {WORKFLOW_STAGES.map((stage, i) => {
        const done = i < currentIdx;
        const active = i === currentIdx;
        const isCheckpoint = HUMAN_CHECKPOINTS.has(stage);
        const isActionRequired = active && (isCheckpoint || isWaiting);

        return (
          <div
            key={stage}
            className={`flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors ${
              isActionRequired
                ? "bg-amber-500/10 border border-amber-500/30"
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
                animate={{ opacity: active ? 1 : done ? 0.9 : 0.5 }}
                className="text-xs truncate"
                style={{
                  color: isActionRequired
                    ? "var(--color-warning)"
                    : active
                    ? "var(--color-text-primary)"
                    : "var(--color-text-secondary)",
                  fontWeight: active ? 600 : 400,
                }}
              >
                {stage.replace(/_/g, " ")}
              </motion.span>

              {isActionRequired ? (
                <span className="shrink-0 rounded bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-400 animate-pulse">
                  Action Required
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
  );
}
