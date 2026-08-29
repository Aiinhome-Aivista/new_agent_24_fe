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
      if (document.hidden || !alive) return;
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

    // Visibility change listener
    const handleVisibilityChange = () => {
      if (!document.hidden && alive) {
        tick();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      alive = false;
      if (timerId) clearInterval(timerId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [intervalMs, active]);

  return data;
}
