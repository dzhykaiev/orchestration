"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { buildApiUrl } from "../lib/api-base";

interface UseSSEOptions {
  projectId?: string;
  onEvent?: (event: { type: string; payload: unknown }) => void;
  enabled?: boolean;
  reconnectInterval?: number;
}

export function useSSE(options: UseSSEOptions) {
  const { projectId, onEvent, enabled = true, reconnectInterval = 5000 } = options;

  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cleanup = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    cleanup();

    const url = projectId
      ? buildApiUrl(`/api/events?projectId=${encodeURIComponent(projectId)}`)
      : buildApiUrl("/api/events");

    const es = new EventSource(url);
    eventSourceRef.current = es;

    const eventTypes = [
      "task.started",
      "task.completed",
      "task.failed",
      "workstream.started",
      "workstream.completed",
      "workstream.failed",
      "project.planning_completed",
    ];

    es.onopen = () => {
      setConnected(true);
      setError(null);
    };

    for (const eventType of eventTypes) {
      es.addEventListener(eventType, (event: MessageEvent) => {
        try {
          const payload = JSON.parse(event.data);
          onEventRef.current?.({ type: eventType, payload });
        } catch {
          // ignore malformed event data
        }
      });
    }

    es.onerror = () => {
      setConnected(false);
      setError("Connection lost. Reconnecting...");
      es.close();
      eventSourceRef.current = null;

      reconnectTimerRef.current = setTimeout(() => {
        connect();
      }, reconnectInterval);
    };
  }, [projectId, reconnectInterval, cleanup]);

  useEffect(() => {
    if (!enabled) return;

    connect();
    return cleanup;
  }, [enabled, connect, cleanup]);

  return { connected, error };
}
