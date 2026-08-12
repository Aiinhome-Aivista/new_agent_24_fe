import { useCallback, useEffect, useState } from "react";

interface AsyncState<T> { data: T | null; loading: boolean; error: string | null; }

/** Standardizes loading / success / empty / error handling for API calls. */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [state, setState] = useState<AsyncState<T>>({ data: null, loading: true, error: null });

  const run = useCallback(() => {
    setState({ data: null, loading: true, error: null });
    fn()
      .then((data) => setState({ data, loading: false, error: null }))
      .catch((e: unknown) => setState({ data: null, loading: false, error: (e as Error).message }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => { run(); }, [run]);
  return { ...state, reload: run };
}
