'use client';

import { useState } from 'react';
import type { TabulaPersonarumEntry, PersonaResonance } from '@in-midst-my-life/schema';
import { MASK_PERSONALITY_RELATIONS, PERSONALITY_TAXONOMY } from '@in-midst-my-life/content-model';

interface PersonaeSelectorProps {
  personas: TabulaPersonarumEntry[];
  resonances?: PersonaResonance[];
  selectedPersonaId?: string;
  onSelectPersona: (personaId: string) => void;
  loading?: boolean;
}

/**
 * Enhanced persona selector showcasing theatrical identity masks.
 *
 * Displays:
 * - Nomen (Latin theatrical name)
 * - Everyday name
 * - Role vector (what this mask does)
 * - Tone register (how it speaks)
 * - Visibility scope (which scaenae it operates in)
 * - Motto (Latin epigraph)
 * - Resonance fit score (if available)
 */
export function PersonaeSelector({
  personas,
  resonances = [],
  selectedPersonaId,
  onSelectPersona,
  loading = false,
}: PersonaeSelectorProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="section" style={{ padding: '1.2rem' }}>
        <div className="label" style={{ marginBottom: '1rem' }}>
          Loading Theatrical Personas...
        </div>
      </div>
    );
  }

  if (personas.length === 0) {
    return (
      <div className="section" style={{ padding: '1.2rem' }}>
        <div className="label" style={{ marginBottom: '1rem' }}>
          No Personas Available
        </div>
        <p className="section-subtitle">
          Create your first theatrical persona to begin presenting different aspects of yourself.
        </p>
      </div>
    );
  }

  const getResonanceForPersona = (personaId: string): PersonaResonance | undefined => {
    return resonances.find((r) => r.persona_id === personaId);
  };

  return (
    <div className="section" style={{ padding: '1.2rem' }}>
      <div className="label" style={{ marginBottom: '0.5rem' }}>
        Dramatis Personae
      </div>
      <p className="section-subtitle" style={{ marginBottom: '1rem' }}>
        Select a theatrical mask to filter your curriculum vitae. Each persona emphasizes different
        dimensions of your complete self.
      </p>

      <div className="stack" style={{ gap: '0.75rem' }}>
        {personas.map((persona) => {
          const resonance = getResonanceForPersona(persona.id);
          const isSelected = selectedPersonaId === persona.id;
          const isExpanded = expandedId === persona.id;

          return (
            <div
              key={persona.id}
              className={`stat-card ${isSelected ? 'active' : ''}`}
              style={{
                cursor: 'pointer',
                border: isSelected ? '2px solid var(--accent)' : '1px solid rgba(29, 26, 22, 0.08)',
                background: isSelected ? 'rgba(211, 107, 60, 0.05)' : '#fff',
                transition: 'all 0.2s ease',
                padding: '1rem',
              }}
            >
              {/* Header: Click to select/expand */}
              <div
                onClick={() => {
                  onSelectPersona(persona.id);
                  setExpandedId(isExpanded ? null : persona.id);
                }}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'start',
                  gap: '1rem',
                }}
              >
                <div style={{ flex: 1 }}>
                  {/* Latin Name */}
                  <div
                    className="stat-label"
                    style={{
                      color: isSelected ? 'var(--accent)' : 'var(--stone)',
                      marginBottom: '0.2rem',
                      fontSize: '0.85rem',
                      fontStyle: 'italic',
                    }}
                  >
                    {persona.nomen}
                  </div>

                  {/* Everyday Name */}
                  <div
                    className="stat-value"
                    style={{
                      fontSize: '1.3rem',
                      marginBottom: '0.3rem',
                      color: 'var(--dark)',
                    }}
                  >
                    {persona.everyday_name}
                  </div>

                  {/* Motto if present */}
                  {persona.motto && (
                    <div
                      style={{
                        fontSize: '0.9rem',
                        fontStyle: 'italic',
                        color: 'var(--stone)',
                        marginBottom: '0.5rem',
                      }}
                    >
                      "{persona.motto}"
                    </div>
                  )}

                  {/* Resonance fit score */}
                  {resonance && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        fontSize: '0.85rem',
                      }}
                    >
                      <span
                        className="chip"
                        style={{
                          background:
                            resonance.fit_score >= 80
                              ? 'rgba(76, 175, 80, 0.15)'
                              : resonance.fit_score >= 60
                                ? 'rgba(255, 193, 7, 0.15)'
                                : 'rgba(244, 67, 54, 0.15)',
                          color:
                            resonance.fit_score >= 80
                              ? '#4CAF50'
                              : resonance.fit_score >= 60
                                ? '#FFC107'
                                : '#F44336',
                        }}
                      >
                        Fit Score: {resonance.fit_score}%
                      </span>
                      {resonance.success_count && resonance.success_count > 0 && (
                        <span className="chip" style={{ fontSize: '0.8rem' }}>
                          {resonance.success_count} successes
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Expand icon */}
                <div
                  style={{
                    fontSize: '1.2rem',
                    transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s ease',
                  }}
                >
                  ⌄
                </div>
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div
                  style={{
                    marginTop: '1rem',
                    paddingTop: '1rem',
                    borderTop: '1px solid rgba(29, 26, 22, 0.08)',
                  }}
                >
                  {/* Role Vector */}
                  <div style={{ marginBottom: '0.75rem' }}>
                    <div className="label" style={{ marginBottom: '0.3rem', fontSize: '0.9rem' }}>
                      Role & Function
                    </div>
                    <p className="section-subtitle" style={{ margin: 0 }}>
                      {persona.role_vector}
                    </p>
                  </div>

                  {/* Tone Register */}
                  <div style={{ marginBottom: '0.75rem' }}>
                    <div className="label" style={{ marginBottom: '0.3rem', fontSize: '0.9rem' }}>
                      Tone & Presentation
                    </div>
                    <p className="section-subtitle" style={{ margin: 0 }}>
                      {persona.tone_register}
                    </p>
                  </div>

                  {/* Visibility Scope */}
                  {persona.visibility_scope && persona.visibility_scope.length > 0 && (
                    <div style={{ marginBottom: '0.75rem' }}>
                      <div className="label" style={{ marginBottom: '0.3rem', fontSize: '0.9rem' }}>
                        Theatrical Stages
                      </div>
                      <div className="chip-row" style={{ gap: '0.5rem' }}>
                        {persona.visibility_scope.map((scope) => (
                          <span key={scope} className="chip" style={{ fontSize: '0.85rem' }}>
                            {scope}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Description */}
                  {persona.description && (
                    <div style={{ marginBottom: '0.75rem' }}>
                      <div className="label" style={{ marginBottom: '0.3rem', fontSize: '0.9rem' }}>
                        Description
                      </div>
                      <p className="section-subtitle" style={{ margin: 0 }}>
                        {persona.description}
                      </p>
                    </div>
                  )}

                  {/* Personality Traits (from taxonomy) */}
                  {(() => {
                    const nameLower = persona.everyday_name.toLowerCase();
                    const maskId = Object.keys(MASK_PERSONALITY_RELATIONS).find((id) =>
                      nameLower.includes(id),
                    );
                    const personalityId = maskId ? MASK_PERSONALITY_RELATIONS[maskId] : undefined;
                    const personality = personalityId
                      ? PERSONALITY_TAXONOMY.find((p) => p.id === personalityId)
                      : undefined;
                    if (!personality) return null;
                    return (
                      <div style={{ marginBottom: '0.75rem' }}>
                        <div
                          className="label"
                          style={{ marginBottom: '0.3rem', fontSize: '0.9rem' }}
                        >
                          Personality Profile
                        </div>
                        <div className="chip-row" style={{ gap: '0.4rem', flexWrap: 'wrap' }}>
                          {personality.cognitiveStyle && (
                            <span className="chip" style={{ fontSize: '0.8rem' }}>
                              {personality.cognitiveStyle}
                            </span>
                          )}
                          {personality.communicationMode && (
                            <span className="chip" style={{ fontSize: '0.8rem' }}>
                              {personality.communicationMode}
                            </span>
                          )}
                          {personality.decisionFramework && (
                            <span className="chip" style={{ fontSize: '0.8rem' }}>
                              {personality.decisionFramework}
                            </span>
                          )}
                          {personality.leadershipStyle && (
                            <span className="chip" style={{ fontSize: '0.8rem' }}>
                              {personality.leadershipStyle}
                            </span>
                          )}
                        </div>
                        {personality.orientation && (
                          <p
                            className="section-subtitle"
                            style={{ margin: '0.3rem 0 0', fontStyle: 'italic' }}
                          >
                            {personality.orientation}
                          </p>
                        )}
                      </div>
                    );
                  })()}

                  {/* Resonance Details */}
                  {resonance && (
                    <div style={{ marginTop: '1rem' }}>
                      <div className="label" style={{ marginBottom: '0.3rem', fontSize: '0.9rem' }}>
                        Context Fit Analysis
                      </div>
                      {resonance.context && (
                        <p
                          className="section-subtitle"
                          style={{ margin: 0, marginBottom: '0.3rem' }}
                        >
                          <strong>Context:</strong> {resonance.context}
                        </p>
                      )}
                      {resonance.alignment_keywords && resonance.alignment_keywords.length > 0 && (
                        <div style={{ marginBottom: '0.3rem' }}>
                          <span className="section-subtitle" style={{ fontSize: '0.8rem' }}>
                            <strong>Alignment Keywords:</strong>{' '}
                          </span>
                          <div className="chip-row" style={{ gap: '0.3rem', marginTop: '0.2rem' }}>
                            {resonance.alignment_keywords.map((keyword) => (
                              <span
                                key={keyword}
                                className="chip"
                                style={{
                                  fontSize: '0.75rem',
                                  background: 'rgba(76, 175, 80, 0.15)',
                                  color: '#4CAF50',
                                }}
                              >
                                {keyword}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {resonance.misalignment_keywords &&
                        resonance.misalignment_keywords.length > 0 && (
                          <div>
                            <span className="section-subtitle" style={{ fontSize: '0.8rem' }}>
                              <strong>Misalignment Keywords:</strong>{' '}
                            </span>
                            <div
                              className="chip-row"
                              style={{ gap: '0.3rem', marginTop: '0.2rem' }}
                            >
                              {resonance.misalignment_keywords.map((keyword) => (
                                <span
                                  key={keyword}
                                  className="chip"
                                  style={{
                                    fontSize: '0.75rem',
                                    background: 'rgba(244, 67, 54, 0.15)',
                                    color: '#F44336',
                                  }}
                                >
                                  {keyword}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default PersonaeSelector;
