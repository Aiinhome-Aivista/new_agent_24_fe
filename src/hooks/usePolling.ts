import { useEffect, useRef, useState } from "react";

/** Polls an async fn on an interval — used by the workflow execution monitor. */
export function usePolling<T>(fn: () => Promise<T>, intervalMs = 2500, active = true) {
  const [data, setData] = useState<T | null>(null);
  const saved = useRef(fn);
  saved.current = fn;

  useEffect(() => {
    if (!active) return;
    let alive = true;
    const tick = () => saved.current().then((d) => { if (alive) setData(d); }).catch(() => undefined);
    tick();
    const id = setInterval(tick, intervalMs);
    return () => { alive = false; clearInterval(id); };
  }, [intervalMs, active]);

  return data;
}
