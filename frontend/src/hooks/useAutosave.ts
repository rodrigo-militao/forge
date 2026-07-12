import { useEffect, useRef, useCallback } from "react";

interface UseAutosaveOptions {
  save: () => Promise<void>;
  deps: unknown[];
  delay?: number;
  enabled?: boolean;
}

export function useAutosave({ save, deps, delay = 2000, enabled = true }: UseAutosaveOptions) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savingRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const triggerSave = useCallback(async () => {
    if (savingRef.current) return;
    savingRef.current = true;
    try {
      await save();
    } finally {
      savingRef.current = false;
    }
  }, [save]);

  useEffect(() => {
    if (!enabled) return;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      triggerSave();
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
