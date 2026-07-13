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
  const dirtyRef = useRef(false);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Mark dirty whenever deps change — content hasn't been saved yet
  useEffect(() => {
    dirtyRef.current = true;
    setIsSynced(false);
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  const triggerSave = useCallback(async () => {
    if (savingRef.current) return;
    savingRef.current = true;
    setIsSaving(true);
    try {
      await save();
      if (mountedRef.current) {
        dirtyRef.current = false;
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
  }, [save]);

  // Debounce: schedule save after `delay` ms of inactivity
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
  }, [enabled, delay, ...deps]);

  return { isSynced, isSaving, error };
}
