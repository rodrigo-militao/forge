import { useCallback, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { ContentItem } from "../api/client";

interface UseJobPollingOptions {
  /** Poll interval in milliseconds (default: 5000) */
  interval?: number;
  /** Timeout in milliseconds before giving up (default: 60000) */
  timeout?: number;
  /** Filter function to select relevant items from content list */
  filter?: (item: ContentItem) => boolean;
  /** Called with the newly detected items when the poll succeeds */
  onComplete?: (items: ContentItem[]) => void;
  /** Called when the poll times out */
  onTimeout?: () => void;
}

/**
 * Polls /api/content when `active` is true, comparing the current matching
 * item count against the baseline captured when it was last activated.
 * Cleans up the interval on unmount or deactivation.
 */
export function useJobPolling(
  active: boolean,
  baseline: number,
  opts: UseJobPollingOptions = {},
) {
  const queryClient = useQueryClient();
  const baselineRef = useRef(baseline);
  const optsRef = useRef(opts);
  optsRef.current = opts;

  // Capture the baseline when active transitions from false → true.
  const prevActiveRef = useRef(active);
  if (active && !prevActiveRef.current) {
    baselineRef.current = baseline;
  }
  prevActiveRef.current = active;

  useEffect(() => {
    if (!active) return;

    const { interval = 5000, timeout = 60000, filter = () => true } = optsRef.current;

    const startTime = Date.now();
    const pollId = setInterval(async () => {
      await queryClient.refetchQueries({ queryKey: ["content"] });
      const data = queryClient.getQueryData<ContentItem[]>(["content"]);
      const matching = Array.isArray(data) ? data.filter(filter) : [];

      if (matching.length > baselineRef.current) {
        clearInterval(pollId);
        optsRef.current.onComplete?.(matching.slice(baselineRef.current));
        return;
      }

      if (Date.now() - startTime > timeout) {
        clearInterval(pollId);
        optsRef.current.onTimeout?.();
      }
    }, interval);

    return () => clearInterval(pollId);
  }, [active, queryClient]);
}
