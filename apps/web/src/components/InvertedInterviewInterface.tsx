'use client';

import { useState } from 'react';
import type { TabulaPersonarumEntry, PersonaResonance } from '@in-midst-my-life/schema';

interface InterviewQuestion {
  id: string;
  question: string;
  category: 'culture' | 'growth' | 'sustainability' | 'impact' | 'values';
  required: boolean;
}

interface InterviewResponse {
  questionId: string;
  question: string;
  answer: string;
  rating?: number;
}

interface InvertedInterviewInterfaceProps {
  profilePersona: TabulaPersonarumEntry | null;
  questions?: InterviewQuestion[];
  responses?: InterviewResponse[];
  onSubmitResponse?: (response: InterviewResponse) => void;
  onCalculateCompatibility?: (
    persona: TabulaPersonarumEntry,
    responses: InterviewResponse[],
  ) => PersonaResonance;
  loading?: boolean;
}

/**
 * Inverted Interview Interface
 *
 * Inverts traditional hiring power dynamics:
 * - Candidate asks employer about their organization
 * - Questions cover 5 dimensions: culture, growth, sustainability, impact, values
 * - Real-time compatibility scoring
 * - Transparent evaluation from both sides
 */
export function InvertedInterviewInterface({
  profilePersona,
  questions: providedQuestions,
  responses: providedResponses = [],
  onSubmitResponse,
  onCalculateCompatibility,
  loading = false,
}: InvertedInterviewInterfaceProps) {
  const defaultQuestions: InterviewQuestion[] = [
    {
      id: 'q1',
      question: 'How does your organization support continuous learning and growth?',
      category: 'growth',
      required: true,
    },
    {
      id: 'q2',
      question: 'What values are genuinely lived (not just stated) in your culture?',
      category: 'values',
      required: true,
    },
    {
      id: 'q3',
      question: 'How do you measure long-term team sustainability vs. short-term output?',
      category: 'sustainability',
      required: true,
    },
    {
      id: 'q4',
      question: 'What is the actual distribution of power and decision-making in teams?',
      category: 'culture',
      required: true,
    },
    {
      id: 'q5',
      question: 'How do you evaluate the impact of work beyond metrics?',
      category: 'impact',
      required: false,
    },
  ];

  const questions = providedQuestions || defaultQuestions;
  const [responses, setResponses] = useState<InterviewResponse[]>(providedResponses);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [currentRating, setCurrentRating] = useState(3);
  const [compatibility, setCompatibility] = useState<PersonaResonance | null>(null);
  const [showResults, setShowResults] = useState(false);

  if (loading) {
    return (
      <div className="section">
        <h2 className="section-title">Inverted Interview</h2>
        <p className="section-subtitle">Loading interview interface...</p>
      </div>
    );
  }

  if (!profilePersona) {
    return (
      <div className="section">
        <h2 className="section-title">Inverted Interview</h2>
        <p className="section-subtitle">
          Select your theatrical persona to begin the inverted interview where you evaluate the
          organization's fit for you.
        </p>
      </div>
    );
  }

  const handleNextQuestion = () => {
    if (currentAnswer.trim()) {
      const response: InterviewResponse = {
        questionId: questions[currentQuestionIdx]!.id,
        question: questions[currentQuestionIdx]!.question,
        answer: currentAnswer,
        rating: currentRating,
      };

      const newResponses = [
        ...responses.filter((r) => r.questionId !== response.questionId),
        response,
      ];
      setResponses(newResponses);
      onSubmitResponse?.(response);

      if (currentQuestionIdx < questions.length - 1) {
        setCurrentQuestionIdx(currentQuestionIdx + 1);
        setCurrentAnswer('');
        setCurrentRating(3);
      } else {
        // All questions answered, calculate compatibility
        if (onCalculateCompatibility) {
          const result = onCalculateCompatibility(profilePersona, newResponses);
          setCompatibility(result);
        }
        setShowResults(true);
      }
    }
  };

  const currentQuestion = questions[currentQuestionIdx];
  const progress = Math.round(((currentQuestionIdx + 1) / questions.length) * 100);
  const requiredAnswered = responses.filter((r) => {
    const q = questions.find((qq) => qq.id === r.questionId);
    return q?.required;
  }).length;
  const requiredTotal = questions.filter((q) => q.required).length;

  const categoryEmoji: Record<string, string> = {
    culture: '🏛️',
    growth: '🚀',
    sustainability: '🌱',
    impact: '⭐',
    values: '💎',
  };

  if (showResults) {
    return (
      <div className="section">
        <h2 className="section-title">Interview Results</h2>

        {/* Compatibility Score */}
        <div
          style={{
            background: 'rgba(211, 107, 60, 0.1)',
            border: '2px solid var(--accent)',
            padding: '2rem',
            marginBottom: '2rem',
            borderRadius: '4px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '3rem', fontWeight: '700', color: 'var(--accent)' }}>
            {compatibility?.fit_score ?? 0}%
          </div>
          <div className="label" style={{ fontSize: '1rem' }}>
            Organizational Fit for {profilePersona.everyday_name}
          </div>
          <p className="section-subtitle">
            Based on your evaluation across {requiredAnswered} core dimensions
          </p>
        </div>

        {/* Resonance Analysis */}
        {compatibility && (
          <div className="stat-card" style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1rem 0' }}>Analysis</h3>

            {compatibility.context && (
              <div style={{ marginBottom: '1rem' }}>
                <div className="label" style={{ marginBottom: '0.3rem' }}>
                  Context
                </div>
                <p className="section-subtitle" style={{ margin: 0 }}>
                  {compatibility.context}
                </p>
              </div>
            )}

            {compatibility.alignment_keywords && compatibility.alignment_keywords.length > 0 && (
              <div style={{ marginBottom: '1rem' }}>
                <div className="label" style={{ marginBottom: '0.5rem' }}>
                  Strong Alignments
                </div>
                <div className="chip-row" style={{ gap: '0.5rem' }}>
                  {compatibility.alignment_keywords.map((keyword) => (
                    <span
                      key={keyword}
                      className="chip"
                      style={{
                        background: 'rgba(76, 175, 80, 0.15)',
                        color: '#4CAF50',
                      }}
                    >
                      ✓ {keyword}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {compatibility.misalignment_keywords &&
              compatibility.misalignment_keywords.length > 0 && (
                <div>
                  <div className="label" style={{ marginBottom: '0.5rem' }}>
                    Areas of Concern
                  </div>
                  <div className="chip-row" style={{ gap: '0.5rem' }}>
                    {compatibility.misalignment_keywords.map((keyword) => (
                      <span
                        key={keyword}
                        className="chip"
                        style={{
                          background: 'rgba(244, 67, 54, 0.15)',
                          color: '#F44336',
                        }}
                      >
                        ⚠ {keyword}
                      </span>
                    ))}
                  </div>
                </div>
              )}
          </div>
        )}

        {/* Responses Summary */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ margin: '0 0 1rem 0' }}>Your Responses</h3>
          <div className="stack" style={{ gap: '0.75rem' }}>
            {responses.map((response) => {
              const q = questions.find((qq) => qq.id === response.questionId);
              return (
                <div key={response.questionId} className="stat-card">
                  <div style={{ marginBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '1.2rem' }}>
                        {categoryEmoji[q?.category || 'culture']}
                      </span>
                      <div className="label" style={{ margin: 0 }}>
                        {response.question}
                      </div>
                    </div>
                  </div>
                  <p className="section-subtitle" style={{ margin: '0.5rem 0 0 0' }}>
                    {response.answer}
                  </p>
                  {response.rating && (
                    <div style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>
                      <strong>Your Rating:</strong> {response.rating} / 5
                      <div style={{ marginTop: '0.3rem' }}>
                        {'★'.repeat(response.rating)}
                        {'☆'.repeat(5 - response.rating)}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Next Steps */}
        <div
          style={{
            background: 'rgba(63, 81, 181, 0.05)',
            border: '1px solid rgba(63, 81, 181, 0.2)',
            padding: '1.5rem',
            borderRadius: '4px',
          }}
        >
          <h3 style={{ margin: '0 0 0.75rem 0' }}>Next Steps</h3>
          <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
            <li style={{ marginBottom: '0.5rem' }}>
              {compatibility && compatibility.fit_score >= 70
                ? 'Strong alignment! Consider advancing this opportunity.'
                : compatibility && compatibility.fit_score >= 50
                  ? 'Moderate fit with some concerns. Further discussion recommended.'
                  : 'Significant misalignments. Consider whether this role aligns with your values.'}
            </li>
            <li style={{ marginBottom: '0.5rem' }}>
              Share this interview with the organization to demonstrate your evaluation criteria.
            </li>
            <li>
              Use these responses to prepare questions for the organizational interview stage.
            </li>
          </ul>
        </div>

        <div className="hero-actions" style={{ marginTop: '1.5rem' }}>
          <button
            className="button secondary"
            onClick={() => {
              setResponses([]);
              setCurrentQuestionIdx(0);
              setCurrentAnswer('');
              setCurrentRating(3);
              setShowResults(false);
            }}
          >
            Restart Interview
          </button>
          <button className="button ghost" onClick={() => alert('Download feature coming soon')}>
            Download Report
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="section">
      <h2 className="section-title">Inverted Interview: {profilePersona.everyday_name}</h2>

      <p className="section-subtitle">
        In the inverted interview, <strong>you</strong> evaluate the organization. Answer
        thoughtfully to help both parties understand fit.
      </p>

      {/* Progress Bar */}
      <div style={{ marginBottom: '2rem' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '0.5rem',
            fontSize: '0.9rem',
          }}
        >
          <span>
            Question {currentQuestionIdx + 1} of {questions.length}
          </span>
          <span>
            {requiredAnswered} / {requiredTotal} required questions answered
          </span>
        </div>
        <div
          style={{
            background: 'rgba(29, 26, 22, 0.08)',
            height: '8px',
            borderRadius: '4px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              background: 'var(--accent)',
              height: '100%',
              width: `${progress}%`,
              transition: 'width 0.3s ease',
            }}
          />
        </div>
      </div>

      {/* Current Question */}
      <div
        style={{
          background: 'rgba(211, 107, 60, 0.05)',
          border: '2px solid var(--accent)',
          padding: '2rem',
          marginBottom: '2rem',
          borderRadius: '4px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'start', gap: '1rem', marginBottom: '1rem' }}>
          <div style={{ fontSize: '2rem' }}>
            {categoryEmoji[currentQuestion?.category || 'culture']}
          </div>
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontSize: '0.85rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--stone)',
                marginBottom: '0.5rem',
              }}
            >
              {currentQuestion?.category}
            </div>
            <h3 style={{ margin: 0, fontSize: '1.3rem', lineHeight: '1.4' }}>
              {currentQuestion?.question}
            </h3>
          </div>
        </div>

        {/* Answer Input */}
        <textarea
          className="input"
          rows={6}
          value={currentAnswer}
          onChange={(e) => setCurrentAnswer(e.target.value)}
          placeholder="Share your thoughts about this question..."
          style={{ marginBottom: '1rem' }}
        />

        {/* Rating */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label className="label" style={{ marginBottom: '0.5rem' }}>
            How confident are you in this answer?
          </label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setCurrentRating(star)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.8rem',
                  cursor: 'pointer',
                  opacity: star <= currentRating ? 1 : 0.3,
                  transition: 'opacity 0.2s ease',
                }}
              >
                {star <= currentRating ? '★' : '☆'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="hero-actions">
        <button className="button" onClick={handleNextQuestion} disabled={!currentAnswer.trim()}>
          {currentQuestionIdx < questions.length - 1 ? 'Next Question' : 'Calculate Fit'}
        </button>
        {currentQuestionIdx > 0 && (
          <button
            className="button ghost"
            onClick={() => {
              setCurrentQuestionIdx(currentQuestionIdx - 1);
              const prevResponse = responses.find(
                (r) => r.questionId === questions[currentQuestionIdx - 1]?.id,
              );
              setCurrentAnswer(prevResponse?.answer || '');
              setCurrentRating(prevResponse?.rating || 3);
            }}
          >
            Previous
          </button>
        )}
      </div>

      {/* Info */}
      <div
        style={{
          background: 'rgba(63, 81, 181, 0.05)',
          border: '1px solid rgba(63, 81, 181, 0.2)',
          padding: '1rem',
          marginTop: '1.5rem',
          borderRadius: '4px',
          fontSize: '0.85rem',
        }}
      >
        <p className="section-subtitle" style={{ margin: 0 }}>
          💡 <strong>Tip:</strong> The Inverted Interview is designed to give you power in the
          hiring process. Be honest about what matters to you. Your answers will help determine if
          this organization is right for you.
        </p>
      </div>
    </div>
  );
}

export default InvertedInterviewInterface;
