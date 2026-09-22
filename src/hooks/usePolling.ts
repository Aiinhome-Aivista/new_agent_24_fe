import { useEffect, useRef, useState } from "react";

/**
 * Smart adaptive polling hook.
 * - Polls only when `active` is true.
 * - Automatically pauses when browser tab is inactive/hidden to conserve resources.
 * - Resumes immediately on tab focus.
 */
export function usePolling<T>(fn: () => Promise<T>, intervalMs = 2500, active = true) {
  const [data, setData] = useState<T | null>(null);
  const saved = useRef(fn);
  saved.current = fn;

  useEffect(() => {
    if (!active) return;

    let alive = true;
    let timerId: ReturnType<typeof setInterval> | null = null;

    const tick = async () => {
      if (!alive) return;
      try {
        const result = await saved.current();
        if (alive) setData(result);
      } catch {
        // Silently ignore transient network drops during polling
      }
    };

    // Immediate initial poll
    tick();

    // Start interval timer
    timerId = setInterval(tick, intervalMs);

    // Visibility and focus change listeners to immediately re-poll on focus
    const handleFocusOrVisible = () => {
      if (alive) {
        tick();
      }
    };
    document.addEventListener("visibilitychange", handleFocusOrVisible);
    window.addEventListener("focus", handleFocusOrVisible);

    return () => {
      alive = false;
      if (timerId) clearInterval(timerId);
      document.removeEventListener("visibilitychange", handleFocusOrVisible);
      window.removeEventListener("focus", handleFocusOrVisible);
    };
  }, [intervalMs, active]);

  return data;
}
