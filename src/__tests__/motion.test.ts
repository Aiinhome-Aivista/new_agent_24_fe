import { describe, it, expect } from "vitest";
import { prefersReducedMotion, pageTransition, DURATION } from "@/styles/motion";

describe("motion utilities", () => {
  it("prefersReducedMotion returns a boolean and is safe without matchMedia", () => {
    expect(typeof prefersReducedMotion()).toBe("boolean");
  });
  it("pageTransition has initial/animate/exit", () => {
    expect(pageTransition).toHaveProperty("initial");
    expect(pageTransition).toHaveProperty("animate");
    expect(pageTransition).toHaveProperty("exit");
  });
  it("durations are positive", () => {
    expect(DURATION.base).toBeGreaterThan(0);
  });
});
