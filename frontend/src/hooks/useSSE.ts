import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

const SSE_URL = "/api/events";

/**
 * Subscribes to the SSE event stream (GET /api/events).
 * On receiving a "content_changed" event, invalidates the TanStack
 * Query cache so the affected pages refetch content.
 *
 * Automatically reconnects (EventSource native behavior).
 */
export function useSSE() {
  const queryClient = useQueryClient();
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function connect() {
      const es = new EventSource(SSE_URL);
      eventSourceRef.current = es;

      es.onopen = () => {
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      };

      es.addEventListener("content_changed", () => {
        queryClient.invalidateQueries({ queryKey: ["content"] });
      });

      es.onerror = () => {
        es.close();
        eventSourceRef.current = null;
        // Native EventSource reconnects automatically, but add a safety timeout
        reconnectTimeoutRef.current = setTimeout(connect, 5000);
      };
    }

    connect();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [queryClient]);
}
