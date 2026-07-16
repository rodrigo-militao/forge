import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../lib/queryKeys";

const SSE_URL = "/api/events";

export function useSSE() {
  const queryClient = useQueryClient();
  const esRef = useRef<EventSource | null>(null);
  const staleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const es = new EventSource(SSE_URL);
    esRef.current = es;

    es.addEventListener("content_changed", () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.content.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.editions.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.digest.stats });
    });

    es.onopen = () => {
      // Clear the stale-data fallback — we're connected
      if (staleTimerRef.current) {
        clearTimeout(staleTimerRef.current);
        staleTimerRef.current = null;
      }
      // Invalidate on reconnect to catch events missed during downtime
      queryClient.invalidateQueries({ queryKey: queryKeys.content.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.editions.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.digest.stats });
    };

    es.onerror = () => {
      // Don't close the EventSource — the browser auto-reconnects.
      // Set a fallback: if we don't reconnect within 30s, invalidate
      // the cache so the next interaction triggers a fresh fetch.
      if (!staleTimerRef.current) {
        staleTimerRef.current = setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: queryKeys.content.all });
          queryClient.invalidateQueries({ queryKey: queryKeys.editions.all });
          queryClient.invalidateQueries({ queryKey: queryKeys.digest.stats });
          staleTimerRef.current = null;
        }, 30000);
      }
    };

    return () => {
      es.close();
      esRef.current = null;
      if (staleTimerRef.current) {
        clearTimeout(staleTimerRef.current);
        staleTimerRef.current = null;
      }
    };
  }, [queryClient]);
}
