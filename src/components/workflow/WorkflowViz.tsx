import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { HERO_STEPS } from "@/constants/workflow";
import { prefersReducedMotion } from "@/styles/motion";

/**
 * Signature element: the requirement→evidence→ALM pipeline as an orchestrated
 * GSAP reveal. A pulse travels the chain to convey "AI proposes, tools execute,
 * humans approve" as a continuous, auditable flow — not a robot mascot.
 */
export function WorkflowViz() {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (prefersReducedMotion() || !root.current) return;
    const nodes = root.current.querySelectorAll<HTMLElement>("[data-node]");
    const links = root.current.querySelectorAll<HTMLElement>("[data-link]");
    const ctx = gsap.context(() => {
      gsap.set(nodes, { opacity: 0, y: 14 });
      gsap.set(links, { scaleX: 0, transformOrigin: "left center" });
      const tl = gsap.timeline();
      nodes.forEach((node, i) => {
        tl.to(node, { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" }, i * 0.18);
        if (links[i]) tl.to(links[i], { scaleX: 1, duration: 0.18, ease: "none" }, i * 0.18 + 0.28);
      });
      // Continuous pulse traveling along the chain
      tl.to(nodes, {
        boxShadow: "0 0 0 3px color-mix(in srgb, var(--color-primary) 40%, transparent)",
        duration: 0.3, stagger: { each: 0.18, repeat: -1, repeatDelay: HERO_STEPS.length * 0.18 },
        yoyo: true,
      }, "+=0.3");
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <div ref={root} className="flex flex-wrap items-center justify-center gap-y-4">
      {HERO_STEPS.map((step, i) => (
        <div key={step} className="flex items-center">
          <div data-node
            className="surface-elevated flex h-16 min-w-[90px] items-center justify-center px-3 text-center text-sm font-medium text-[var(--color-text-primary)]">
            {step}
          </div>
          {i < HERO_STEPS.length - 1 && (
            <div data-link className="h-0.5 w-6 sm:w-10" style={{ background: "var(--color-border-orange)" }} />
          )}
        </div>
      ))}
    </div>
  );
}
