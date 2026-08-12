import { motion } from "framer-motion";
import { fadeUp } from "@/styles/motion";
import { ReactNode } from "react";

export function KpiCard({ label, value, suffix, icon }: { label: string; value: ReactNode; suffix?: string; icon?: ReactNode }) {
  return (
    <motion.div variants={fadeUp} className="surface-elevated p-5">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-secondary)]">{label}</span>
        {icon && <span className="text-[var(--color-primary)]">{icon}</span>}
      </div>
      <div className="font-display text-3xl font-semibold text-[var(--color-text-primary)]">
        {value}{suffix && <span className="ml-1 text-lg text-[var(--color-text-secondary)]">{suffix}</span>}
      </div>
    </motion.div>
  );
}
