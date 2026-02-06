'use client';

import { useParams } from 'next/navigation';
import { useState } from 'react';
import { AppHeader } from '@/components/AppHeader';
import { PersonaeSelector } from '@/components/PersonaeSelector';
import { InvertedInterviewInterface } from '@/components/InvertedInterviewInterface';
import { useProfileData } from '@/hooks/useProfileData';
import { usePersonae } from '@/hooks/usePersonae';
import type { TabulaPersonarumEntry, PersonaResonance } from '@in-midst-my-life/schema';

interface InterviewResponse {
  questionId: string;
  question: string;
  answer: string;
  rating?: number;
}

/**
 * Inverted Interview Page
 *
 * Provides:
 * - Interview orchestration for selected persona
 * - Multi-dimensional compatibility scoring
 * - Theatrical framing (evaluating organizations)
 * - Results and analysis
 */
export default function InterviewPage() {
  const params = useParams();
  const profileId = params['profileId'] as string | null;

  const { profile, loading: _profileLoading } = useProfileData(profileId);
  const {
    personas,
    selectedPersonaId,
    selectPersona,
    loading: personaeLoading,
  } = usePersonae(profileId);

  const [showSelector, setShowSelector] = useState(!selectedPersonaId);
  const [interviewResponses, setInterviewResponses] = useState<InterviewResponse[]>([]);
  const [compatibility, setCompatibility] = useState<PersonaResonance | null>(null);

  const selectedPersona = personas.find((p) => p.id === selectedPersonaId) || null;

  if (!profileId) {
    return (
      <main style={{ padding: '2rem' }}>
        <h1>Profile Not Found</h1>
      </main>
    );
  }

  const handleCalculateCompatibility = (
    persona: TabulaPersonarumEntry,
    responses: InterviewResponse[],
  ): PersonaResonance => {
    // Simple compatibility scoring based on response ratings
    const avgRating =
      responses.length > 0
        ? responses.reduce((sum, r) => sum + (r.rating || 3), 0) / responses.length
        : 3;

    const fitScore = Math.round(avgRating * 20); // Convert 1-5 scale to 0-100

    // Analyze alignment based on keywords
    const alignmentKeywords = [
      'growth',
      'learning',
      'culture',
      'values',
      'impact',
      'sustainability',
    ];
    const misalignmentKeywords = ['burnout', 'churn', 'toxic', 'constraints', 'limitations'];

    const responseText = responses.map((r) => r.answer.toLowerCase()).join(' ');

    const aligned = alignmentKeywords.filter((kw) => responseText.includes(kw));
    const misaligned = misalignmentKeywords.filter((kw) => responseText.includes(kw));

    return {
      persona_id: persona.id,
      context: `Interview evaluation for ${persona.everyday_name} persona`,
      fit_score: fitScore,
      alignment_keywords: aligned,
      misalignment_keywords: misaligned,
      success_count: responses.length,
      feedback: `Compatibility based on ${responses.length} response${responses.length !== 1 ? 's' : ''}`,
    };
  };

  return (
    <>
      <AppHeader
        profileId={profileId}
        profileName={profile?.displayName}
        currentPersona={selectedPersona}
        allPersonas={personas}
        onSelectPersona={selectPersona}
        loading={personaeLoading}
      />

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
        <section style={{ marginBottom: '2rem' }}>
          <h1 style={{ marginTop: 0, marginBottom: '0.5rem' }}>Inverted Interview</h1>
          <p style={{ color: 'var(--stone)' }}>
            Evaluate organizations through your selected theatrical persona. You ask the questions
            and assess cultural fit.
          </p>
        </section>

        {/* Layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '2rem' }}>
          {/* Left: Persona Selector */}
          <div>
            {showSelector ? (
              <>
                <PersonaeSelector
                  personas={personas}
                  selectedPersonaId={selectedPersonaId || undefined}
                  onSelectPersona={(id) => {
                    selectPersona(id);
                    setShowSelector(false);
                    setInterviewResponses([]);
                    setCompatibility(null);
                  }}
                  loading={personaeLoading}
                />
                <button
                  className="button ghost"
                  onClick={() => setShowSelector(false)}
                  style={{ marginTop: '1rem', width: '100%' }}
                >
                  Hide
                </button>
              </>
            ) : (
              <div
                style={{
                  background: 'rgba(211, 107, 60, 0.05)',
                  border: '1px solid rgba(211, 107, 60, 0.2)',
                  padding: '1.5rem',
                  borderRadius: '4px',
                }}
              >
                <div className="label" style={{ marginBottom: '1rem' }}>
                  Interview Persona
                </div>
                {selectedPersona ? (
                  <>
                    <div style={{ marginBottom: '1rem' }}>
                      <div className="stat-value" style={{ fontSize: '1.1rem', margin: 0 }}>
                        {selectedPersona.everyday_name}
                      </div>
                      <div
                        style={{
                          fontSize: '0.8rem',
                          color: 'var(--stone)',
                          fontStyle: 'italic',
                          marginTop: '0.3rem',
                        }}
                      >
                        {selectedPersona.nomen}
                      </div>
                    </div>
                    {compatibility && (
                      <div
                        style={{
                          background: 'rgba(76, 175, 80, 0.1)',
                          padding: '0.75rem',
                          borderRadius: '4px',
                          marginBottom: '1rem',
                          textAlign: 'center',
                        }}
                      >
                        <div
                          style={{
                            fontSize: '1.8rem',
                            fontWeight: '700',
                            color: '#4CAF50',
                          }}
                        >
                          {compatibility.fit_score}%
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--stone)' }}>Fit Score</div>
                      </div>
                    )}
                    <button
                      className="button ghost"
                      onClick={() => setShowSelector(true)}
                      style={{ width: '100%', marginBottom: '0.5rem' }}
                    >
                      Change Persona
                    </button>
                    {interviewResponses.length > 0 && (
                      <button
                        className="button ghost"
                        onClick={() => {
                          setInterviewResponses([]);
                          setCompatibility(null);
                        }}
                        style={{ width: '100%' }}
                      >
                        Reset Interview
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <p className="section-subtitle" style={{ margin: 0 }}>
                      Select a persona to begin the inverted interview.
                    </p>
                    <button
                      className="button"
                      onClick={() => setShowSelector(true)}
                      style={{ marginTop: '1rem', width: '100%' }}
                    >
                      Select Persona
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Information */}
            <div
              style={{
                marginTop: '1.5rem',
                background: 'rgba(63, 81, 181, 0.05)',
                border: '1px solid rgba(63, 81, 181, 0.2)',
                padding: '1rem',
                borderRadius: '4px',
                fontSize: '0.85rem',
              }}
            >
              <div style={{ fontWeight: '600', marginBottom: '0.5rem' }}>💡 Inverted Interview</div>
              <p className="section-subtitle" style={{ margin: 0, fontSize: '0.8rem' }}>
                In this interview, <strong>you</strong> evaluate the organization. Answer
                thoughtfully to assess cultural and value alignment.
              </p>
            </div>
          </div>

          {/* Right: Interview Interface */}
          <div>
            {selectedPersona ? (
              <InvertedInterviewInterface
                profilePersona={selectedPersona}
                responses={interviewResponses}
                onSubmitResponse={(response) => {
                  setInterviewResponses((prev) => [
                    ...prev.filter((r) => r.questionId !== response.questionId),
                    response,
                  ]);
                }}
                onCalculateCompatibility={(persona, responses) => {
                  const result = handleCalculateCompatibility(persona, responses);
                  setCompatibility(result);
                  return result;
                }}
              />
            ) : (
              <div
                style={{
                  background: 'rgba(29, 26, 22, 0.02)',
                  padding: '3rem',
                  borderRadius: '4px',
                  textAlign: 'center',
                  minHeight: '500px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'column',
                }}
              >
                <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🎭</div>
                <h3 style={{ margin: '0 0 0.5rem 0' }}>Select Your Persona</h3>
                <p style={{ color: 'var(--stone)', margin: 0, maxWidth: '300px' }}>
                  Choose which theatrical mask you'll use to evaluate this organization. Different
                  personas may assess fit differently.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* About Inverted Interviews */}
        <section
          style={{
            marginTop: '3rem',
            background: 'rgba(63, 81, 181, 0.05)',
            border: '1px solid rgba(63, 81, 181, 0.2)',
            padding: '2rem',
            borderRadius: '4px',
          }}
        >
          <h2 style={{ marginTop: 0 }}>About Inverted Interviews</h2>
          <div style={{ columns: '2', gap: '2rem', columnGap: '2rem' }}>
            <div>
              <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '1rem' }}>Power Dynamics</h3>
              <p className="section-subtitle">
                Traditional interviews give all the power to employers. Inverted interviews balance
                this by letting you (the candidate) ask questions and evaluate.
              </p>
            </div>
            <div>
              <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '1rem' }}>Five Dimensions</h3>
              <p className="section-subtitle">
                Questions cover: Culture, Growth, Sustainability, Impact, and Values. These reveal
                what an organization truly prioritizes versus what they claim.
              </p>
            </div>
            <div>
              <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '1rem' }}>Multiple Perspectives</h3>
              <p className="section-subtitle">
                Evaluate the same organization through different theatrical masks. What fits one
                persona might not fit another—and that's valuable information.
              </p>
            </div>
            <div>
              <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '1rem' }}>Compatibility Scores</h3>
              <p className="section-subtitle">
                The interview generates a fit score based on your responses. Share this with the
                organization to demonstrate your evaluation criteria.
              </p>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
