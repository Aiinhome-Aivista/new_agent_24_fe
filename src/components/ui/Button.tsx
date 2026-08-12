import { ButtonHTMLAttributes } from "react";
import { motion } from "framer-motion";

type Variant = "primary" | "secondary" | "ghost" | "danger";
interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
}

const styles: Record<Variant, string> = {
  primary: "bg-[var(--color-button)] text-white hover:bg-[var(--color-primary-hover)] border-transparent",
  secondary: "bg-transparent text-[var(--color-text-primary)] border-[var(--color-border)] hover:border-[var(--color-border-orange)]",
  ghost: "bg-transparent text-[var(--color-text-secondary)] border-transparent hover:text-[var(--color-primary)]",
  danger: "bg-[var(--color-error)] text-white border-transparent hover:opacity-90",
};

export function Button({ variant = "primary", loading, children, className = "", disabled, ...rest }: Props) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      className={`inline-flex items-center justify-center gap-2 rounded-[10px] border px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${styles[variant]} ${className}`}
      disabled={disabled || loading}
      {...(rest as object)}
    >
      {loading && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />}
      {children}
    </motion.button>
  );
}
