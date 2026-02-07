'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
  useInterviewSubscription,
  type InterviewScoreEvent,
} from '@/hooks/useInterviewSubscription';

interface AnswerFeedItem {
  questionId: string;
  answer: string;
  tone: string;
  timestamp: string;
  score?: InterviewScoreEvent;
}

const SCORE_COLORS: Record<string, string> = {
  skillMatch: '#3b82f6',
  valuesAlign: '#22c55e',
  growthFit: '#eab308',
  sustainability: '#8b5cf6',
  compensationFit: '#f97316',
};

const SCORE_LABELS: Record<string, string> = {
  skillMatch: 'Skill Match',
  valuesAlign: 'Values Alignment',
  growthFit: 'Growth Fit',
  sustainability: 'Sustainability',
  compensationFit: 'Compensation Fit',
};

const TONE_INDICATORS: Record<string, { label: string; color: string }> = {
  defensive: { label: 'Defensive', color: '#ef4444' },
  neutral: { label: 'Neutral', color: '#9ca3af' },
  transparent: { label: 'Transparent', color: '#22c55e' },
  enthusiastic: { label: 'Enthusiastic', color: '#3b82f6' },
};

function ScoreGauge({ score, size = 120 }: { score: number; size?: number }) {
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 70 ? '#22c55e' : score >= 40 ? '#eab308' : '#ef4444';

  return (
    <div style={{ width: size, height: size, position: 'relative', margin: '0 auto' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="8"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.6s ease, stroke 0.3s ease' }}
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
        }}
      >
        <span style={{ fontSize: size / 3.5, fontWeight: 700, color: '#fff' }}>{score}</span>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>overall</span>
      </div>
    </div>
  );
}

function CategoryBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div
        style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 3 }}
      >
        <span style={{ color: 'rgba(255,255,255,0.7)' }}>{label}</span>
        <span style={{ color: '#fff', fontWeight: 600 }}>{value}%</span>
      </div>
      <div
        style={{
          width: '100%',
          height: 6,
          background: 'rgba(255,255,255,0.1)',
          borderRadius: 3,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${value}%`,
            height: '100%',
            background: color,
            borderRadius: 3,
            transition: 'width 0.6s ease',
          }}
        />
      </div>
    </div>
  );
}

export default function LiveInterviewDashboard() {
  const params = useParams();
  const profileId = params['profileId'] as string;
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [feed, setFeed] = useState<AnswerFeedItem[]>([]);
  const [pollingActive, setPollingActive] = useState(false);

  // WebSocket subscription for live scores
  const { latestScore, connected } = useInterviewSubscription(sessionId);

  // Also support REST polling fallback: read sessionId from URL query
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const sid = urlParams.get('sessionId');
    if (sid) {
      setSessionId(sid);
      setPollingActive(true);
    }
  }, []);

  // Poll for session data if not connected via WebSocket
  useEffect(() => {
    if (!sessionId || !pollingActive || connected) return;

    const interval = setInterval(() => {
      void (async () => {
        try {
          const res = await fetch(`/api/interviews/sessions/${sessionId}`);
          if (res.ok) {
            const data = (await res.json()) as {
              answers: Array<{
                questionId: string;
                answer: string;
                tone?: string;
                timestamp: string;
              }>;
              status: string;
            };
            setFeed(
              data.answers.map((a) => ({
                questionId: a.questionId,
                answer: a.answer,
                tone: a.tone ?? 'neutral',
                timestamp: a.timestamp,
              })),
            );
            if (data.status === 'completed') {
              setPollingActive(false);
            }
          }
        } catch {
          // Polling is best-effort
        }
      })();
    }, 3000);

    return () => clearInterval(interval);
  }, [sessionId, pollingActive, connected]);

  // When we get a new score from the subscription, update the feed
  useEffect(() => {
    if (latestScore && feed.length < latestScore.answersCount) {
      // The feed will be populated by the REST response or by polling;
      // the subscription just provides the live scores overlay
    }
  }, [latestScore, feed.length]);

  const currentScore = latestScore?.overallScore ?? 0;
  const categories = latestScore?.categoryScores ?? {
    skillMatch: 0,
    valuesAlign: 0,
    growthFit: 0,
    sustainability: 0,
    compensationFit: 0,
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
        padding: '2rem',
      }}
    >
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 700, color: '#fff', margin: 0 }}>
            Live Interview Dashboard
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', marginTop: 8 }}>
            Real-time compatibility scoring for profile {profileId}
          </p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 12 }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 12,
                padding: '4px 10px',
                borderRadius: 12,
                background: connected ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)',
                color: connected ? '#22c55e' : '#ef4444',
                border: `1px solid ${connected ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: connected ? '#22c55e' : '#ef4444',
                }}
              />
              {connected ? 'Live' : 'Polling'}
            </span>
            {sessionId && (
              <span
                style={{
                  fontSize: 12,
                  padding: '4px 10px',
                  borderRadius: 12,
                  background: 'rgba(255,255,255,0.1)',
                  color: 'rgba(255,255,255,0.5)',
                }}
              >
                Session: {sessionId.slice(0, 8)}...
              </span>
            )}
          </div>
        </div>

        {/* Session ID input if none set */}
        {!sessionId && (
          <div
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 16,
              padding: '2rem',
              textAlign: 'center',
            }}
          >
            <p style={{ color: 'rgba(255,255,255,0.7)', marginBottom: 16 }}>
              Enter a session ID or start an interview from the{' '}
              <a
                href={`/interview/${profileId}`}
                style={{ color: '#a78bfa', textDecoration: 'underline' }}
              >
                interview page
              </a>{' '}
              to see live scores.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const input = (e.currentTarget.elements.namedItem('sid') as HTMLInputElement).value;
                if (input) {
                  setSessionId(input);
                  setPollingActive(true);
                }
              }}
              style={{ display: 'flex', gap: 8, maxWidth: 400, margin: '0 auto' }}
            >
              <input
                name="sid"
                type="text"
                placeholder="Session ID"
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: '1px solid rgba(255,255,255,0.2)',
                  background: 'rgba(255,255,255,0.05)',
                  color: '#fff',
                  outline: 'none',
                }}
              />
              <button
                type="submit"
                style={{
                  padding: '8px 20px',
                  borderRadius: 8,
                  background: 'linear-gradient(135deg, #7c3aed, #db2777)',
                  color: '#fff',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Connect
              </button>
            </form>
          </div>
        )}

        {/* Dashboard content */}
        {sessionId && (
          <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: '1.5rem' }}>
            {/* Left panel: Score gauge + categories */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 16,
                  padding: '1.5rem',
                }}
              >
                <h2
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: 'rgba(255,255,255,0.5)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    margin: '0 0 1rem',
                  }}
                >
                  Compatibility Score
                </h2>
                <ScoreGauge score={currentScore} size={140} />
                <p
                  style={{
                    textAlign: 'center',
                    color: 'rgba(255,255,255,0.5)',
                    fontSize: 13,
                    marginTop: 8,
                  }}
                >
                  {latestScore
                    ? `After ${latestScore.answersCount} answers`
                    : 'Awaiting answers...'}
                </p>
              </div>

              <div
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 16,
                  padding: '1.5rem',
                }}
              >
                <h2
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: 'rgba(255,255,255,0.5)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    margin: '0 0 1rem',
                  }}
                >
                  Category Breakdown
                </h2>
                {Object.entries(categories).map(([key, value]) => (
                  <CategoryBar
                    key={key}
                    label={SCORE_LABELS[key] ?? key}
                    value={value}
                    color={SCORE_COLORS[key] ?? '#9ca3af'}
                  />
                ))}
              </div>
            </div>

            {/* Right panel: Answer feed */}
            <div
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 16,
                padding: '1.5rem',
              }}
            >
              <h2
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: 'rgba(255,255,255,0.5)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  margin: '0 0 1rem',
                }}
              >
                Answer Feed
              </h2>
              {feed.length === 0 ? (
                <p
                  style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: '3rem 0' }}
                >
                  No answers yet. Scores will appear as the interviewer responds.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {feed.map((item, i) => {
                    const toneInfo = TONE_INDICATORS[item.tone] ?? TONE_INDICATORS['neutral']!;
                    return (
                      <div
                        key={`${item.questionId}-${i}`}
                        style={{
                          padding: '0.75rem 1rem',
                          background: 'rgba(255,255,255,0.03)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          borderRadius: 10,
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: 6,
                          }}
                        >
                          <span
                            style={{
                              fontSize: 12,
                              fontWeight: 600,
                              color: 'rgba(255,255,255,0.5)',
                            }}
                          >
                            {item.questionId}
                          </span>
                          <span
                            style={{
                              fontSize: 11,
                              padding: '2px 8px',
                              borderRadius: 10,
                              background: `${toneInfo.color}22`,
                              color: toneInfo.color,
                              border: `1px solid ${toneInfo.color}44`,
                            }}
                          >
                            {toneInfo.label}
                          </span>
                        </div>
                        <p
                          style={{
                            color: 'rgba(255,255,255,0.8)',
                            fontSize: 14,
                            margin: 0,
                            lineHeight: 1.5,
                          }}
                        >
                          {item.answer.length > 200
                            ? item.answer.slice(0, 200) + '...'
                            : item.answer}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
