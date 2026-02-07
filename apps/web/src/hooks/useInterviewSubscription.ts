'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export interface MaskResonanceEntry {
  maskName: string;
  fitScore: number;
  reasoning: string;
}

export interface InterviewScoreEvent {
  sessionId: string;
  profileId: string;
  answersCount: number;
  overallScore: number;
  categoryScores: {
    skillMatch: number;
    valuesAlign: number;
    growthFit: number;
    sustainability: number;
    compensationFit: number;
  };
  maskResonance?: MaskResonanceEntry[];
  updatedAt: string;
}

interface UseInterviewSubscriptionOptions {
  /** WebSocket endpoint URL (default: ws://localhost:3001/graphql) */
  wsUrl?: string;
  /** Whether to auto-connect when sessionId is set */
  enabled?: boolean;
}

/**
 * Hook for subscribing to live interview score updates via GraphQL over WebSocket.
 *
 * Uses the graphql-ws protocol to subscribe to `interviewScoreUpdated(sessionId)`.
 * Falls back gracefully if the WebSocket connection fails — the REST API still
 * returns incremental scores in the answer response.
 */
export function useInterviewSubscription(
  sessionId: string | null,
  options: UseInterviewSubscriptionOptions = {},
) {
  const { wsUrl = 'ws://localhost:3001/graphql', enabled = true } = options;
  const [latestScore, setLatestScore] = useState<InterviewScoreEvent | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const cleanup = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setConnected(false);
  }, []);

  useEffect(() => {
    if (!sessionId || !enabled) {
      cleanup();
      return;
    }

    try {
      const ws = new WebSocket(wsUrl, 'graphql-transport-ws');
      wsRef.current = ws;

      ws.onopen = () => {
        // graphql-ws protocol: send ConnectionInit
        ws.send(JSON.stringify({ type: 'connection_init' }));
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data as string) as {
            type: string;
            id?: string;
            payload?: { data?: { interviewScoreUpdated?: InterviewScoreEvent } };
          };

          switch (message.type) {
            case 'connection_ack':
              setConnected(true);
              setError(null);
              // Subscribe to interview score updates
              ws.send(
                JSON.stringify({
                  id: `interview-${sessionId}`,
                  type: 'subscribe',
                  payload: {
                    query: `subscription { interviewScoreUpdated(sessionId: "${sessionId}") { sessionId profileId answersCount overallScore categoryScores { skillMatch valuesAlign growthFit sustainability compensationFit } updatedAt } }`,
                  },
                }),
              );
              break;

            case 'next':
              if (message.payload?.data?.interviewScoreUpdated) {
                setLatestScore(message.payload.data.interviewScoreUpdated);
              }
              break;

            case 'error':
              setError('Subscription error');
              break;

            case 'complete':
              // Subscription completed (e.g., server ended it)
              break;
          }
        } catch {
          // Ignore malformed messages
        }
      };

      ws.onerror = () => {
        setError('WebSocket connection failed');
        setConnected(false);
      };

      ws.onclose = () => {
        setConnected(false);
      };
    } catch {
      setError('Failed to create WebSocket');
    }

    return cleanup;
  }, [sessionId, wsUrl, enabled, cleanup]);

  return { latestScore, connected, error };
}
