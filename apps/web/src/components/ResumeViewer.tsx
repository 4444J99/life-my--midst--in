'use client';

import { useState } from 'react';
import type { TabulaPersonarumEntry, CVEntry } from '@in-midst-my-life/schema';

interface ResumeViewerProps {
  persona: TabulaPersonarumEntry | null;
  entries: CVEntry[];
  theatricalPreamble?: string;
  loading?: boolean;
  onExport?: (format: 'pdf' | 'json' | 'markdown') => void;
  onGenerateForMask?: (maskId: string) => void;
  allPersonas?: TabulaPersonarumEntry[];
}

/**
 * Resume viewer with theatrical framing.
 *
 * Displays:
 * - Theatrical preamble explaining the persona lens
 * - Filtered CV entries sorted by priority
 * - Entry grouping by type (experience, education, project, etc.)
 * - Export options (PDF, JSON, Markdown)
 * - "Generate for all masks" option
 */
export function ResumeViewer({
  persona,
  entries,
  theatricalPreamble,
  loading = false,
  onExport,
  onGenerateForMask,
  allPersonas = [],
}: ResumeViewerProps) {
  const [groupBy, setGroupBy] = useState<'type' | 'date'>('type');
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set());

  if (loading) {
    return (
      <div className="section">
        <h2 className="section-title">Resume Viewer</h2>
        <p className="section-subtitle">Loading resume...</p>
      </div>
    );
  }

  if (!persona && entries.length === 0) {
    return (
      <div className="section">
        <h2 className="section-title">Resume Viewer</h2>
        <p className="section-subtitle">
          Select a persona to view a filtered resume that emphasizes your strengths in that context.
        </p>
      </div>
    );
  }

  const toggleType = (type: string) => {
    const newSet = new Set(expandedTypes);
    if (newSet.has(type)) {
      newSet.delete(type);
    } else {
      newSet.add(type);
    }
    setExpandedTypes(newSet);
  };

  // Group entries by type
  const groupedByType = entries.reduce(
    (acc, entry) => {
      const type = entry.type || 'other';
      if (!acc[type]) acc[type] = [];
      acc[type].push(entry);
      return acc;
    },
    {} as Record<string, CVEntry[]>,
  );

  // Sort within each group by priority
  Object.values(groupedByType).forEach((group) => {
    group.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  });

  const typeLabels: Record<string, string> = {
    experience: '💼 Experience',
    education: '🎓 Education',
    project: '🛠️ Projects',
    skill: '⚙️ Skills',
    publication: '📚 Publications',
    achievement: '🏆 Achievements',
    certification: '✓ Certifications',
    award: '🎖️ Awards',
    language: '🌐 Languages',
    volunteer: '🤝 Volunteer Work',
    custom: '📌 Custom',
  };

  return (
    <div className="section">
      <h2 className="section-title">
        {persona ? `Resume: ${persona.everyday_name}` : 'Resume Viewer'}
      </h2>

      {persona && (
        <>
          {/* Theatrical Preamble */}
          {theatricalPreamble && (
            <div
              style={{
                background: 'rgba(211, 107, 60, 0.05)',
                border: '1px solid rgba(211, 107, 60, 0.2)',
                padding: '1rem',
                borderRadius: '4px',
                marginBottom: '1.5rem',
                fontStyle: 'italic',
                lineHeight: '1.6',
              }}
            >
              <p className="section-subtitle" style={{ margin: 0, color: 'var(--dark)' }}>
                {theatricalPreamble}
              </p>
            </div>
          )}

          {/* Persona Header */}
          <div
            style={{
              background: '#fff',
              border: '1px solid rgba(29, 26, 22, 0.08)',
              padding: '1.5rem',
              marginBottom: '1.5rem',
              borderRadius: '4px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1.5rem' }}>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: '0 0 0.3rem 0', fontSize: '1.4rem' }}>
                  {persona.everyday_name}
                </h3>
                <p style={{ margin: '0 0 0.5rem 0', color: 'var(--stone)', fontStyle: 'italic' }}>
                  {persona.nomen}
                </p>
                <p style={{ margin: '0 0 1rem 0', color: 'var(--dark)' }}>{persona.role_vector}</p>
                {persona.motto && (
                  <p style={{ margin: 0, color: 'var(--stone)', fontStyle: 'italic' }}>
                    "{persona.motto}"
                  </p>
                )}
              </div>
              <div style={{ textAlign: 'right' }}>
                {persona.visibility_scope && persona.visibility_scope.length > 0 && (
                  <div>
                    <div className="label" style={{ marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                      Stages
                    </div>
                    <div className="chip-row" style={{ justifyContent: 'flex-end', gap: '0.3rem' }}>
                      {persona.visibility_scope.map((scope) => (
                        <span key={scope} className="chip" style={{ fontSize: '0.8rem' }}>
                          {scope}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Controls */}
          <div
            style={{
              display: 'flex',
              gap: '0.75rem',
              marginBottom: '1.5rem',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <label className="label" style={{ display: 'flex', alignItems: 'center' }}>
                <input
                  type="radio"
                  name="groupBy"
                  value="type"
                  checked={groupBy === 'type'}
                  onChange={() => setGroupBy('type')}
                  style={{ marginRight: '0.3rem' }}
                />
                Group by Type
              </label>
              <label className="label" style={{ display: 'flex', alignItems: 'center' }}>
                <input
                  type="radio"
                  name="groupBy"
                  value="date"
                  checked={groupBy === 'date'}
                  onChange={() => setGroupBy('date')}
                  style={{ marginRight: '0.3rem' }}
                />
                Group by Date
              </label>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem' }}>
              {onExport && (
                <>
                  <button
                    className="button ghost"
                    onClick={() => onExport('markdown')}
                    style={{ fontSize: '0.9rem' }}
                  >
                    MD
                  </button>
                  <button
                    className="button ghost"
                    onClick={() => onExport('json')}
                    style={{ fontSize: '0.9rem' }}
                  >
                    JSON
                  </button>
                  <button
                    className="button"
                    onClick={() => onExport('pdf')}
                    style={{ fontSize: '0.9rem' }}
                  >
                    PDF
                  </button>
                </>
              )}
            </div>
          </div>
        </>
      )}

      {/* Entries */}
      {entries.length === 0 ? (
        <div className="stat-card">
          <p className="section-subtitle">No entries match the filters for this persona.</p>
        </div>
      ) : (
        <div className="stack" style={{ gap: '0.75rem' }}>
          {groupBy === 'type'
            ? Object.entries(groupedByType).map(([type, typeEntries]) => (
                <div key={type} className="stat-card">
                  <div
                    onClick={() => toggleType(type)}
                    style={{
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      paddingBottom: expandedTypes.has(type) ? '0.75rem' : 0,
                      borderBottom: expandedTypes.has(type)
                        ? '1px solid rgba(29, 26, 22, 0.08)'
                        : 'none',
                    }}
                  >
                    <div className="stat-value" style={{ fontSize: '1.1rem', margin: 0 }}>
                      {typeLabels[type] || type}
                    </div>
                    <div style={{ fontSize: '0.9rem', color: 'var(--stone)' }}>
                      {typeEntries.length} •{' '}
                      <span
                        style={{
                          transform: expandedTypes.has(type) ? 'rotate(180deg)' : 'rotate(0deg)',
                          transition: 'transform 0.2s ease',
                          display: 'inline-block',
                        }}
                      >
                        ⌄
                      </span>
                    </div>
                  </div>

                  {expandedTypes.has(type) && (
                    <div style={{ marginTop: '0.75rem' }}>
                      {typeEntries.map((entry) => (
                        <div
                          key={entry.id}
                          style={{
                            paddingBottom: '0.75rem',
                            marginBottom: '0.75rem',
                            borderBottom: '1px solid rgba(29, 26, 22, 0.04)',
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'start',
                              gap: '1rem',
                              marginBottom: '0.3rem',
                            }}
                          >
                            <div style={{ flex: 1 }}>
                              <div className="label" style={{ margin: 0, marginBottom: '0.2rem' }}>
                                {entry.content.split('\n')[0]}
                              </div>
                              {entry.priority && (
                                <div
                                  style={{
                                    fontSize: '0.8rem',
                                    color: 'var(--stone)',
                                    marginBottom: '0.3rem',
                                  }}
                                >
                                  Priority: {entry.priority}
                                </div>
                              )}
                            </div>
                            {entry.startDate && (
                              <div style={{ fontSize: '0.85rem', color: 'var(--stone)' }}>
                                {new Date(entry.startDate).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                })}
                                {entry.endDate &&
                                  ` – ${new Date(entry.endDate).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'short',
                                  })}`}
                              </div>
                            )}
                          </div>

                          {/* Entry tags/personae/aetas */}
                          {(entry.personae?.length ||
                            entry.aetas?.length ||
                            entry.scaenae?.length ||
                            entry.tags?.length) && (
                            <div
                              className="chip-row"
                              style={{ gap: '0.3rem', marginTop: '0.5rem' }}
                            >
                              {entry.tags?.map((tag) => (
                                <span key={tag} className="chip" style={{ fontSize: '0.75rem' }}>
                                  {tag}
                                </span>
                              ))}
                              {entry.aetas?.map((aetas) => (
                                <span
                                  key={aetas}
                                  className="chip"
                                  style={{
                                    fontSize: '0.75rem',
                                    background: 'rgba(63, 81, 181, 0.1)',
                                    color: '#3F51B5',
                                  }}
                                >
                                  {aetas}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            : entries.map((entry) => (
                <div key={entry.id} className="stat-card">
                  <div style={{ marginBottom: '0.5rem' }}>
                    <div className="label" style={{ margin: 0, marginBottom: '0.2rem' }}>
                      {entry.content.split('\n')[0]}
                    </div>
                    {entry.startDate && (
                      <div style={{ fontSize: '0.85rem', color: 'var(--stone)' }}>
                        {new Date(entry.startDate).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </div>
                    )}
                  </div>
                  <p className="section-subtitle" style={{ margin: 0 }}>
                    {entry.content}
                  </p>
                </div>
              ))}
        </div>
      )}

      {/* Batch Generation */}
      {allPersonas && allPersonas.length > 1 && onGenerateForMask && (
        <div
          style={{
            background: 'rgba(63, 81, 181, 0.05)',
            border: '1px solid rgba(63, 81, 181, 0.2)',
            padding: '1.5rem',
            marginTop: '2rem',
            borderRadius: '4px',
          }}
        >
          <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem' }}>Generate Resumes for All Masks</h3>
          <p className="section-subtitle">
            Create filtered resumes for all {allPersonas.length} of your theatrical personas in one
            action.
          </p>
          <div className="hero-actions" style={{ marginTop: '1rem' }}>
            <button
              className="button"
              onClick={() => {
                // This will be handled by the parent component
                alert('Batch generation triggered');
              }}
            >
              Generate All Resumes
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ResumeViewer;
