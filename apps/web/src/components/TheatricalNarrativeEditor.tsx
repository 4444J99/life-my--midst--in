'use client';

import { useState } from 'react';
import type { NarrativeBlock, TabulaPersonarumEntry } from '@in-midst-my-life/schema';

interface TheatricalNarrativeEditorProps {
  persona: TabulaPersonarumEntry | null;
  blocks: NarrativeBlock[];
  theatricalPreamble?: string;
  authenticDisclaimer?: string;
  onSave?: (blocks: NarrativeBlock[], preamble?: string, disclaimer?: string) => void;
  onGenerate?: () => void;
  loading?: boolean;
}

/**
 * Narrative editor with theatrical metadata integration.
 *
 * Allows editing narrative blocks with:
 * - Theatrical metadata (mask_name, scaena, aetas, performance_note)
 * - Authentic caveats about what's emphasized/de-emphasized
 * - Dynamic preamble and disclaimer generation
 */
export function TheatricalNarrativeEditor({
  persona,
  blocks,
  theatricalPreamble,
  authenticDisclaimer,
  onSave,
  onGenerate,
  loading = false,
}: TheatricalNarrativeEditorProps) {
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [editPreamble, setEditPreamble] = useState(theatricalPreamble || '');
  const [editDisclaimer, setEditDisclaimer] = useState(authenticDisclaimer || '');
  const [editBlocks, setEditBlocks] = useState<NarrativeBlock[]>(blocks);

  if (loading) {
    return (
      <div className="section">
        <h2 className="section-title">Narrative Editor</h2>
        <p className="section-subtitle">Loading narrative blocks...</p>
      </div>
    );
  }

  if (!persona) {
    return (
      <div className="section">
        <h2 className="section-title">Narrative Editor</h2>
        <p className="section-subtitle">
          Select a persona to edit its narrative blocks with theatrical metadata.
        </p>
      </div>
    );
  }

  const handleUpdateBlock = (blockId: string, updates: Partial<NarrativeBlock>) => {
    setEditBlocks((prev) =>
      prev.map((block) =>
        block.id === blockId
          ? {
              ...block,
              ...updates,
              theatrical_metadata: {
                ...block.theatrical_metadata,
                ...updates.theatrical_metadata,
              },
            }
          : block,
      ),
    );
  };

  const handleDeleteBlock = (blockId: string) => {
    setEditBlocks((prev) => prev.filter((block) => block.id !== blockId));
  };

  return (
    <div className="section">
      <h2 className="section-title">
        {persona ? `Narrative: ${persona.everyday_name}` : 'Narrative Editor'}
      </h2>

      {/* Theatrical Preamble Editor */}
      <div
        style={{
          background: 'rgba(211, 107, 60, 0.05)',
          border: '1px solid rgba(211, 107, 60, 0.2)',
          padding: '1.5rem',
          marginBottom: '1.5rem',
          borderRadius: '4px',
        }}
      >
        <div className="label" style={{ marginBottom: '0.75rem' }}>
          Theatrical Preamble
        </div>
        <p className="section-subtitle" style={{ marginBottom: '0.75rem' }}>
          This introduces the narrative lens and explains which persona is being presented.
        </p>
        <textarea
          className="input"
          rows={4}
          value={editPreamble}
          onChange={(e) => setEditPreamble(e.target.value)}
          placeholder="e.g., 'The following narrative is presented through the lens of Researcher...'"
        />
      </div>

      {/* Authentic Disclaimer Editor */}
      <div
        style={{
          background: 'rgba(76, 175, 80, 0.05)',
          border: '1px solid rgba(76, 175, 80, 0.2)',
          padding: '1.5rem',
          marginBottom: '1.5rem',
          borderRadius: '4px',
        }}
      >
        <div className="label" style={{ marginBottom: '0.75rem' }}>
          Authentic Disclaimer
        </div>
        <p className="section-subtitle" style={{ marginBottom: '0.75rem' }}>
          Transparency about what's emphasized and what's de-emphasized in this narrative.
        </p>
        <textarea
          className="input"
          rows={3}
          value={editDisclaimer}
          onChange={(e) => setEditDisclaimer(e.target.value)}
          placeholder="e.g., 'This emphasizes technical depth; de-emphasizes teaching and mentoring that occurred in parallel.'"
        />
      </div>

      {/* Narrative Blocks */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div className="label" style={{ marginBottom: '1rem' }}>
          Narrative Blocks ({editBlocks.length})
        </div>

        {editBlocks.length === 0 ? (
          <div className="stat-card">
            <p className="section-subtitle">
              No narrative blocks yet. Generate narrative blocks using the AI and then edit them
              here.
            </p>
          </div>
        ) : (
          <div className="stack" style={{ gap: '0.75rem' }}>
            {editBlocks.map((block) => {
              const isEditing = editingBlockId === block.id;

              return (
                <div key={block.id} className="stat-card">
                  {isEditing ? (
                    <div style={{ display: 'grid', gap: '1rem' }}>
                      {/* Edit Form */}
                      <div>
                        <label className="label">Title</label>
                        <input
                          type="text"
                          className="input"
                          value={block.title}
                          onChange={(e) => handleUpdateBlock(block.id, { title: e.target.value })}
                        />
                      </div>

                      <div>
                        <label className="label">Content</label>
                        <textarea
                          className="input"
                          rows={5}
                          value={block.content}
                          onChange={(e) => handleUpdateBlock(block.id, { content: e.target.value })}
                        />
                      </div>

                      <div>
                        <label className="label">Weight (0-100)</label>
                        <input
                          type="number"
                          className="input"
                          min="0"
                          max="100"
                          value={block.weight ?? 50}
                          onChange={(e) =>
                            handleUpdateBlock(block.id, {
                              weight: parseInt(e.target.value, 10),
                            })
                          }
                        />
                      </div>

                      {/* Theatrical Metadata */}
                      <div
                        style={{
                          background: 'rgba(211, 107, 60, 0.05)',
                          padding: '1rem',
                          borderRadius: '4px',
                        }}
                      >
                        <div
                          className="label"
                          style={{ marginBottom: '0.75rem', fontSize: '0.9rem' }}
                        >
                          Theatrical Metadata
                        </div>

                        <div style={{ display: 'grid', gap: '0.75rem' }}>
                          <div>
                            <label className="label" style={{ fontSize: '0.85rem' }}>
                              Scaena (Stage)
                            </label>
                            <input
                              type="text"
                              className="input"
                              value={block.theatrical_metadata?.scaena || ''}
                              onChange={(e) =>
                                handleUpdateBlock(block.id, {
                                  theatrical_metadata: {
                                    ...block.theatrical_metadata,
                                    scaena: e.target.value,
                                  },
                                })
                              }
                              placeholder="e.g., Academica, Technica"
                            />
                          </div>

                          <div>
                            <label className="label" style={{ fontSize: '0.85rem' }}>
                              Performance Note
                            </label>
                            <input
                              type="text"
                              className="input"
                              value={block.theatrical_metadata?.performance_note || ''}
                              onChange={(e) =>
                                handleUpdateBlock(block.id, {
                                  theatrical_metadata: {
                                    ...block.theatrical_metadata,
                                    performance_note: e.target.value,
                                  },
                                })
                              }
                              placeholder="Why is this block important in this mask?"
                            />
                          </div>

                          <div>
                            <label className="label" style={{ fontSize: '0.85rem' }}>
                              Authentic Caveat
                            </label>
                            <input
                              type="text"
                              className="input"
                              value={block.theatrical_metadata?.authentic_caveat || ''}
                              onChange={(e) =>
                                handleUpdateBlock(block.id, {
                                  theatrical_metadata: {
                                    ...block.theatrical_metadata,
                                    authentic_caveat: e.target.value,
                                  },
                                })
                              }
                              placeholder="What's emphasized/de-emphasized?"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="hero-actions">
                        <button className="button" onClick={() => setEditingBlockId(null)}>
                          Done Editing
                        </button>
                        <button
                          className="button ghost"
                          onClick={() => handleDeleteBlock(block.id)}
                          style={{ color: '#F44336' }}
                        >
                          Delete Block
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Display Mode */}
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'start',
                          gap: '1rem',
                          marginBottom: '0.75rem',
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div className="stat-value" style={{ fontSize: '1.1rem', margin: 0 }}>
                            {block.title}
                          </div>
                          <div style={{ fontSize: '0.85rem', color: 'var(--stone)' }}>
                            Weight: {block.weight ?? 50}% • Type: {block.type}
                          </div>
                        </div>
                        <button
                          className="button ghost"
                          onClick={() => setEditingBlockId(block.id)}
                          style={{ fontSize: '0.85rem' }}
                        >
                          Edit
                        </button>
                      </div>

                      {/* Content Preview */}
                      <p className="section-subtitle" style={{ margin: '0.5rem 0' }}>
                        {block.content.substring(0, 200)}
                        {block.content.length > 200 ? '...' : ''}
                      </p>

                      {/* Theatrical Metadata Display */}
                      {block.theatrical_metadata && (
                        <div
                          style={{
                            background: 'rgba(211, 107, 60, 0.05)',
                            padding: '0.75rem',
                            borderRadius: '4px',
                            fontSize: '0.85rem',
                          }}
                        >
                          {block.theatrical_metadata.scaena && (
                            <div style={{ marginBottom: '0.3rem' }}>
                              <strong>Stage:</strong> {block.theatrical_metadata.scaena}
                            </div>
                          )}
                          {block.theatrical_metadata.performance_note && (
                            <div style={{ marginBottom: '0.3rem' }}>
                              <strong>Note:</strong> {block.theatrical_metadata.performance_note}
                            </div>
                          )}
                          {block.theatrical_metadata.authentic_caveat && (
                            <div>
                              <strong>Caveat:</strong> {block.theatrical_metadata.authentic_caveat}
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="hero-actions">
        <button
          className="button"
          onClick={() => onSave?.(editBlocks, editPreamble, editDisclaimer)}
        >
          Save Narrative
        </button>
        {onGenerate && (
          <button className="button secondary" onClick={onGenerate}>
            Regenerate Blocks
          </button>
        )}
      </div>
    </div>
  );
}

export default TheatricalNarrativeEditor;
