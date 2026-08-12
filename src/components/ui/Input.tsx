import { InputHTMLAttributes, forwardRef } from "react";

interface Props extends InputHTMLAttributes<HTMLInputElement> { label?: string; }

export const Input = forwardRef<HTMLInputElement, Props>(({ label, className = "", ...rest }, ref) => (
  <label className="block">
    {label && <span className="mb-1.5 block text-sm font-medium text-[var(--color-text-secondary)]">{label}</span>}
    <input
      ref={ref}
      className={`w-full rounded-[10px] border border-[var(--color-border)] bg-[var(--color-input)] px-3.5 py-2.5 text-sm text-[var(--color-text-primary)] shadow-[var(--shadow-neu-inset)] outline-none transition-colors focus:border-[var(--color-border-orange)] ${className}`}
      {...rest}
    />
  </label>
));
Input.displayName = "Input";
