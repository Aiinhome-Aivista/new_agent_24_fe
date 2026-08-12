import { WORKFLOW_STAGES, HUMAN_CHECKPOINTS } from "@/constants/workflow";
import { motion } from "framer-motion";
import { User, Check, Loader2 } from "lucide-react";

export function WorkflowStepper({ current }: { current: string }) {
  const currentIdx = WORKFLOW_STAGES.indexOf(current);
  return (
    <div className="flex flex-col gap-1">
      {WORKFLOW_STAGES.map((stage, i) => {
        const done = i < currentIdx;
        const active = i === currentIdx;
        const isCheckpoint = HUMAN_CHECKPOINTS.has(stage);
        return (
          <div key={stage} className="flex items-center gap-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-full border text-xs"
              style={{
                borderColor: done || active ? "var(--color-primary)" : "var(--color-border)",
                background: done ? "var(--color-primary)" : "transparent",
                color: done ? "#fff" : active ? "var(--color-primary)" : "var(--color-text-secondary)",
              }}>
              {done ? <Check size={14} /> : active ? <Loader2 size={14} className="animate-spin" /> : isCheckpoint ? <User size={13} /> : i + 1}
            </div>
            <motion.span
              animate={{ opacity: active ? 1 : done ? 0.9 : 0.5 }}
              className="text-sm"
              style={{ color: active ? "var(--color-text-primary)" : "var(--color-text-secondary)", fontWeight: active ? 600 : 400 }}>
              {stage.replace(/_/g, " ")}
              {isCheckpoint && <span className="ml-2 text-[10px] uppercase tracking-wide text-[var(--color-primary)]">Human</span>}
            </motion.span>
          </div>
        );
      })}
    </div>
  );
}
