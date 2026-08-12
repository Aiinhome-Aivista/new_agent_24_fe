export const DURATION = { fast: 0.2, base: 0.4, slow: 0.7 };
export const EASE = [0.22, 1, 0.36, 1] as const;

export const pageTransition = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: DURATION.base, ease: EASE } },
  exit: { opacity: 0, y: -8, transition: { duration: DURATION.fast, ease: EASE } },
};

export const stagger = {
  animate: { transition: { staggerChildren: 0.08 } },
};

export const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: DURATION.base, ease: EASE } },
};

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
