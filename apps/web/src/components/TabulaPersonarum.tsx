'use client';

/**
 * Tabula Personarum Component
 *
 * Mask Registry Editor - Create, edit, and manage professional identity masks
 * Part of the theatrical metaphor: "Table of Personas"
 *
 * Features:
 * - View all 16 masks with descriptions
 * - Create custom mask variants
 * - Edit mask attributes (name, traits, visibility)
 * - Set temporal ranges (when mask is active)
 * - Configure stage visibility
 * - Preview mask-specific narrative
 */

import { useState, useEffect } from 'react';
import type { Mask } from '@in-midst-my-life/schema';

// API error class
class ApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface TabulaPersonarumProps {
  profileId: string;
  masks: Mask[];
  onMaskCreated?: (mask: Mask) => void;
  onMaskUpdated?: (mask: Mask) => void;
  onMaskDeleted?: (maskId: string) => void;
}

export interface MaskFormData {
  name: string;
  description: string;
  traits: string[];
  visibleOn: string[]; // Scaenae stages
  activeFrom?: Date;
  activeTo?: Date;
  isPrimary?: boolean;
}

/**
 * Main component
 */
export function TabulaPersonarum({
  profileId,
  masks: initialMasks,
  onMaskCreated,
  onMaskUpdated,
  onMaskDeleted,
}: TabulaPersonarumProps) {
  const [masks, setMasks] = useState<Mask[]>(initialMasks);
  const [isCreateMode, setIsCreateMode] = useState(false);
  const [selectedMask, setSelectedMask] = useState<Mask | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load masks on mount
  useEffect(() => {
    const loadMasks = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/profiles/${profileId}/masks`);
        if (!response.ok) throw new ApiError(`Failed to load masks`, response.status);
        const { data } = await response.json();
        setMasks(data || []);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load masks';
        setError(message);
        // Keep initial masks as fallback
        setMasks(initialMasks);
      } finally {
        setIsLoading(false);
      }
    };

    void loadMasks();
  }, [profileId, initialMasks]);

  return (
    <div className="tabula-personarum">
      <style jsx>{`
        .tabula-personarum {
          display: grid;
          grid-template-columns: 1fr 2fr;
          gap: 2rem;
          padding: 1.5rem;
          background: linear-gradient(135deg, rgba(17, 24, 39, 0.5) 0%, rgba(31, 41, 55, 0.3) 100%);
          border-radius: 12px;
          border: 1px solid rgba(107, 114, 128, 0.2);
        }

        .masks-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .mask-item {
          padding: 1rem;
          background: rgba(55, 65, 81, 0.5);
          border: 1px solid rgba(107, 114, 128, 0.3);
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .mask-item:hover {
          background: rgba(75, 85, 99, 0.7);
          border-color: rgba(147, 154, 166, 0.5);
        }

        .mask-item.active {
          background: rgba(59, 130, 246, 0.2);
          border-color: rgba(59, 130, 246, 0.5);
          box-shadow: 0 0 12px rgba(59, 130, 246, 0.2);
        }

        .mask-name {
          font-weight: 500;
          color: rgba(229, 231, 235, 0.9);
        }

        .mask-badge {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .trait-chip {
          font-size: 0.75rem;
          padding: 0.25rem 0.5rem;
          background: rgba(107, 114, 128, 0.3);
          border-radius: 4px;
          color: rgba(209, 213, 219, 0.8);
        }

        .detail-panel {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .form-label {
          font-size: 0.875rem;
          font-weight: 500;
          color: rgba(209, 213, 219, 0.9);
        }

        .form-input {
          padding: 0.75rem;
          background: rgba(75, 85, 99, 0.6);
          border: 1px solid rgba(107, 114, 128, 0.4);
          border-radius: 6px;
          color: rgba(229, 231, 235, 0.9);
          font-family: inherit;
        }

        .form-input:focus {
          outline: none;
          border-color: rgba(59, 130, 246, 0.6);
          box-shadow: 0 0 8px rgba(59, 130, 246, 0.1);
        }

        .visibility-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 0.75rem;
        }

        .checkbox-group {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .checkbox-group input {
          width: 1rem;
          height: 1rem;
          cursor: pointer;
        }

        .button-group {
          display: flex;
          gap: 0.75rem;
        }

        .button {
          padding: 0.75rem 1.5rem;
          background: rgba(59, 130, 246, 0.7);
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s ease;
        }

        .button:hover {
          background: rgba(59, 130, 246, 0.9);
        }

        .button.ghost {
          background: transparent;
          border: 1px solid rgba(107, 114, 128, 0.5);
          color: rgba(209, 213, 219, 0.8);
        }

        .button.ghost:hover {
          background: rgba(107, 114, 128, 0.2);
          border-color: rgba(147, 154, 166, 0.7);
        }

        .empty-state {
          grid-column: 1 / -1;
          text-align: center;
          padding: 3rem 1rem;
          color: rgba(156, 163, 175, 0.7);
        }
      `}</style>

      <div className="masks-list">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '0.75rem',
          }}
        >
          <h3 style={{ color: 'rgba(229, 231, 235, 0.9)', margin: 0 }}>Masks ({masks.length})</h3>
          <button
            className="button"
            onClick={() => setIsCreateMode(!isCreateMode)}
            disabled={isLoading}
          >
            {isCreateMode ? '✕ Cancel' : '+ New Mask'}
          </button>
        </div>

        {error && (
          <div
            style={{
              padding: '0.75rem',
              background: 'rgba(220, 38, 38, 0.15)',
              border: '1px solid rgba(220, 38, 38, 0.3)',
              borderRadius: '6px',
              color: 'rgba(254, 202, 202, 0.9)',
              fontSize: '0.875rem',
              marginBottom: '0.75rem',
            }}
          >
            ⚠️ {error}
          </div>
        )}

        {masks.length === 0 && !isCreateMode && (
          <div className="empty-state">
            <p>No masks yet. Create your first professional persona.</p>
          </div>
        )}

        {masks.map((mask) => (
          <div
            key={mask.id}
            className={`mask-item ${selectedMask?.id === mask.id ? 'active' : ''}`}
            onClick={() => {
              setSelectedMask(mask);
              setIsEditing(false);
            }}
          >
            <div>
              <div className="mask-name">{mask.name}</div>
              {mask.visibility_scope && mask.visibility_scope.length > 0 && (
                <div className="mask-badge">
                  {mask.visibility_scope.slice(0, 3).map((scope) => (
                    <span key={scope} className="trait-chip">
                      {scope}
                    </span>
                  ))}
                  {mask.visibility_scope.length > 3 && (
                    <span className="trait-chip">+{mask.visibility_scope.length - 3}</span>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {isCreateMode && (
          <div
            className="mask-item"
            style={{ background: 'rgba(34, 197, 94, 0.15)', borderColor: 'rgba(34, 197, 94, 0.3)' }}
          >
            <MaskForm
              isLoading={isLoading}
              onSubmit={async (data) => {
                setIsLoading(true);
                setError(null);
                try {
                  const response = await fetch(`/api/profiles/${profileId}/masks`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data),
                  });
                  if (!response.ok) throw new ApiError('Failed to create mask', response.status);
                  const { data: newMask } = await response.json();
                  setMasks([...masks, newMask]);
                  onMaskCreated?.(newMask);
                  setIsCreateMode(false);
                } catch (err) {
                  const message = err instanceof Error ? err.message : 'Failed to create mask';
                  setError(message);
                } finally {
                  setIsLoading(false);
                }
              }}
            />
          </div>
        )}
      </div>

      <div className="detail-panel">
        {selectedMask && !isEditing ? (
          <>
            <MaskDetail mask={selectedMask} />
            <div className="button-group">
              <button className="button" onClick={() => setIsEditing(true)}>
                ✎ Edit Mask
              </button>
              <button
                className="button ghost"
                onClick={async () => {
                  if (!confirm('Are you sure you want to delete this mask?')) return;
                  setIsLoading(true);
                  setError(null);
                  try {
                    const response = await fetch(
                      `/api/profiles/${profileId}/masks/${selectedMask.id}`,
                      {
                        method: 'DELETE',
                      },
                    );
                    if (!response.ok) throw new ApiError('Failed to delete mask', response.status);
                    setMasks(masks.filter((m) => m.id !== selectedMask.id));
                    onMaskDeleted?.(selectedMask.id);
                    setSelectedMask(null);
                  } catch (err) {
                    const message = err instanceof Error ? err.message : 'Failed to delete mask';
                    setError(message);
                  } finally {
                    setIsLoading(false);
                  }
                }}
                disabled={isLoading}
              >
                🗑 Delete
              </button>
            </div>
          </>
        ) : selectedMask && isEditing ? (
          <>
            <MaskForm
              initialData={selectedMask}
              isLoading={isLoading}
              onSubmit={async (data) => {
                setIsLoading(true);
                setError(null);
                try {
                  const response = await fetch(
                    `/api/profiles/${profileId}/masks/${selectedMask.id}`,
                    {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(data),
                    },
                  );
                  if (!response.ok) throw new ApiError('Failed to update mask', response.status);
                  const { data: updatedMask } = await response.json();
                  setMasks(masks.map((m) => (m.id === selectedMask.id ? updatedMask : m)));
                  setSelectedMask(updatedMask);
                  onMaskUpdated?.(updatedMask);
                  setIsEditing(false);
                } catch (err) {
                  const message = err instanceof Error ? err.message : 'Failed to update mask';
                  setError(message);
                } finally {
                  setIsLoading(false);
                }
              }}
              onCancel={() => setIsEditing(false)}
            />
          </>
        ) : (
          <div style={{ color: 'rgba(156, 163, 175, 0.6)', textAlign: 'center', padding: '2rem' }}>
            Select or create a mask to view details
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Mask Detail View
 * Shows read-only information about a mask
 */
function MaskDetail({ mask }: { mask: Mask }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div>
        <h2 style={{ margin: '0 0 0.5rem 0', color: 'rgba(229, 231, 235, 0.9)' }}>{mask.name}</h2>
        {mask.functional_scope && (
          <p style={{ margin: 0, color: 'rgba(156, 163, 175, 0.8)', fontSize: '0.9rem' }}>
            {mask.functional_scope}
          </p>
        )}
      </div>

      {mask.visibility_scope && mask.visibility_scope.length > 0 && (
        <div>
          <h3
            style={{
              margin: '0 0 0.75rem 0',
              fontSize: '0.9rem',
              color: 'rgba(209, 213, 219, 0.8)',
            }}
          >
            Visibility Scope
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {mask.visibility_scope?.map((scope) => (
              <span
                key={scope}
                style={{
                  padding: '0.5rem 0.75rem',
                  background: 'rgba(59, 130, 246, 0.15)',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  borderRadius: '4px',
                  color: 'rgba(191, 219, 254, 0.9)',
                  fontSize: '0.85rem',
                }}
              >
                {scope}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* TODO: Show visibility stages, temporal range, and sample narrative preview */}
    </div>
  );
}

/**
 * Mask Form Component
 * For creating and editing masks
 */
interface MaskFormProps {
  initialData?: Mask;
  isLoading?: boolean;
  onSubmit: (data: MaskFormData) => void;
  onCancel?: () => void;
}

function MaskForm({ initialData, isLoading, onSubmit, onCancel }: MaskFormProps) {
  const [formData, setFormData] = useState<MaskFormData>({
    name: initialData?.name || '',
    description: initialData?.functional_scope || '',
    traits: initialData?.visibility_scope || [],
    visibleOn: initialData?.visibility_scope || [],
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div className="form-group">
        <label className="form-label">Mask Name</label>
        <input
          className="form-input"
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g., The Architect, The Problem Solver"
        />
      </div>

      <div className="form-group">
        <label className="form-label">Description</label>
        <textarea
          className="form-input"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="What does this mask represent? When is it active?"
          style={{ minHeight: '80px', fontFamily: 'inherit' }}
        />
      </div>

      <div className="button-group">
        <button className="button" type="submit" disabled={isLoading}>
          {isLoading ? '⏳ Saving...' : initialData ? '✓ Save' : '+ Create'}
        </button>
        {onCancel && (
          <button className="button ghost" type="button" onClick={onCancel} disabled={isLoading}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

export default TabulaPersonarum;
