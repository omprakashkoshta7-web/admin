import { useEffect, useState, useCallback, useRef } from 'react';

export type AsyncState<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
};

export const useAsync = <T>(
  promiseFactory: () => Promise<T>,
  initialData: T | null = null,
  deps: unknown[] = []
): AsyncState<T> => {
  const [data, setData] = useState<T | null>(initialData);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Always keep a ref to the latest promiseFactory so refetch never goes stale
  const factoryRef = useRef(promiseFactory);
  useEffect(() => {
    factoryRef.current = promiseFactory;
  });

  // execute is stable — never recreated, always calls the latest factory via ref
  const execute = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    factoryRef.current()
      .then((result) => {
        if (!cancelled) {
          setData(result);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err?.message || 'Failed to load');
          console.warn('useAsync error:', err);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []); // stable — no deps needed, uses ref

  // Run on mount and whenever deps change
  useEffect(() => {
    const cleanup = execute();
    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  // refetch is also stable — same reference across renders
  const refetch = useCallback(() => {
    execute();
  }, [execute]);

  return { data, loading, error, refetch };
};
