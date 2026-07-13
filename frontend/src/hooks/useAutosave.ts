import { useState, useEffect, useRef, useCallback } from "react";

interface UseAutosaveOptions {
  save: () => Promise<void>;
  deps: unknown[];
  delay?: number;
  enabled?: boolean;
}

interface UseAutosaveResult {
  isSynced: boolean;
  isSaving: boolean;
  error: string | null;
}

function depsChanged(a: unknown[], b: unknown[]): boolean {
  if (a.length !== b.length) return true;
  return a.some((v, i) => v !== b[i]);
}

export function useAutosave({
  save,
  deps,
  delay = 3000,
  enabled = true,
}: UseAutosaveOptions): UseAutosaveResult {
  const [isSynced, setIsSynced] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savingRef = useRef(false);
  const mountedRef = useRef(true);
  const lastDepsRef = useRef<unknown[]>(deps);
  const isDirtyRef = useRef(false);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Track whether deps have changed since last save
  useEffect(() => {
    if (depsChanged(deps, lastDepsRef.current)) {
      isDirtyRef.current = true;
      setIsSynced(false);
      setError(null);
    }
  }, deps);

  const triggerSave = useCallback(async () => {
    if (savingRef.current || !isDirtyRef.current) return;
    savingRef.current = true;
    setIsSaving(true);
    try {
      await save();
      if (mountedRef.current) {
        lastDepsRef.current = [...deps];
        isDirtyRef.current = false;
        setIsSynced(true);
        setError(null);
      }
    } catch (err) {
      if (mountedRef.current) {
        const msg = err instanceof Error ? err.message : "Save failed";
        setError(msg);
        setIsSynced(false);
      }
    } finally {
      savingRef.current = false;
      if (mountedRef.current) {
        setIsSaving(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [save]);

  // Debounce: schedule save after delay ms of inactivity
  useEffect(() => {
    if (!enabled) return;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Only schedule if there are unsaved changes
    if (isDirtyRef.current) {
      timeoutRef.current = setTimeout(() => {
        triggerSave();
      }, delay);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, delay, ...deps]);

  return { isSynced, isSaving, error };
}
