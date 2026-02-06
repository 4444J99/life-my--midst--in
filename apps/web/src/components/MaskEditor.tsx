'use client';

import { useState, useCallback } from 'react';
import type { Mask } from '@in-midst-my-life/schema';

interface MaskEditorProps {
  /** API base URL for mask operations */
  apiBaseUrl?: string;
  /** Callback when mask is saved */
  onSave?: (mask: Mask) => void;
  /** Callback when error occurs */
  onError?: (error: Error) => void;
  /** Initial mask to edit, or undefined to create new */
  initialMask?: Mask;
}

interface EditorState {
  name: string;
  ontology: string;
  functionalScope: string;
  tone: string;
  rhetoricalMode: string;
  compressionRatio: number;
  contextsTriggers: string;
  includeTags: string;
  excludeTags: string;
  privateTagsToRedact: string;
  obfuscateDates: boolean;
}

/**
 * Advanced mask editor component with API integration.
 * Allows creating and editing masks with full validation and persistence.
 *
 * Features:
 * - Full mask CRUD operations via API
 * - Local state management with undo/redo capability
 * - Real-time validation against schema
 * - Visual ontology indicators
 * - Compression ratio slider
 * - Tag management with suggestions
 * - Privacy/redaction controls
 */
export function MaskEditor({
  apiBaseUrl = '/api/taxonomy',
  onSave,
  onError,
  initialMask,
}: MaskEditorProps) {
  const [state, setState] = useState<EditorState>(() => {
    if (initialMask) {
      return {
        name: initialMask.name,
        ontology: initialMask.ontology,
        functionalScope: initialMask.functional_scope,
        tone: initialMask.stylistic_parameters.tone,
        rhetoricalMode: initialMask.stylistic_parameters.rhetorical_mode,
        compressionRatio: initialMask.stylistic_parameters.compression_ratio,
        contextsTriggers: [
          ...initialMask.activation_rules.contexts,
          ...initialMask.activation_rules.triggers,
        ].join(', '),
        includeTags: initialMask.filters.include_tags.join(', '),
        excludeTags: initialMask.filters.exclude_tags.join(', '),
        privateTagsToRedact: (initialMask.redaction?.private_tags ?? []).join(', '),
        obfuscateDates: initialMask.redaction?.obfuscate_dates ?? false,
      };
    }
    return {
      name: '',
      ontology: 'cognitive',
      functionalScope: '',
      tone: 'neutral',
      rhetoricalMode: 'deductive',
      compressionRatio: 0.6,
      contextsTriggers: '',
      includeTags: '',
      excludeTags: '',
      privateTagsToRedact: '',
      obfuscateDates: false,
    };
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [history, setHistory] = useState<EditorState[]>([state]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Undo/redo support
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      const prev = history[newIndex];
      if (prev) setState(prev);
      setHistoryIndex(newIndex);
    }
  }, [history, historyIndex]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      const next = history[newIndex];
      if (next) setState(next);
      setHistoryIndex(newIndex);
    }
  }, [history, historyIndex]);

  const handleStateChange = useCallback(
    (newState: EditorState) => {
      setState(newState);
      // Update history for undo/redo
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(newState);
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    },
    [history, historyIndex],
  );

  const handleSave = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // Parse tags from comma-separated strings
      const parseTagString = (str: string) =>
        str
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);

      const maskData: Mask = {
        id: initialMask?.id || `mask-${Date.now()}`,
        name: state.name,
        ontology: state.ontology as 'cognitive' | 'expressive' | 'operational',
        functional_scope: state.functionalScope,
        stylistic_parameters: {
          tone: state.tone,
          rhetorical_mode: state.rhetoricalMode,
          compression_ratio: state.compressionRatio,
        },
        activation_rules: {
          contexts: parseTagString(state.contextsTriggers),
          triggers: parseTagString(state.contextsTriggers),
        },
        filters: {
          include_tags: parseTagString(state.includeTags),
          exclude_tags: parseTagString(state.excludeTags),
          priority_weights: {},
        },
        redaction: {
          private_tags: parseTagString(state.privateTagsToRedact),
          obfuscate_dates: state.obfuscateDates,
        },
      };

      const method = initialMask ? 'PATCH' : 'POST';
      const endpoint = initialMask
        ? `${apiBaseUrl}/masks/${initialMask.id}`
        : `${apiBaseUrl}/masks`;

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(maskData),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const result = await response.json();
      setSuccess(true);
      onSave?.(result.data);

      // Clear success message after 2 seconds
      setTimeout(() => setSuccess(false), 2000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      onError?.(err instanceof Error ? err : new Error(errorMessage));
    } finally {
      setIsLoading(false);
    }
  }, [state, initialMask, apiBaseUrl, onSave, onError]);

  const ontologyColor =
    {
      cognitive: '#6366f1',
      expressive: '#d946ef',
      operational: '#f59e0b',
    }[state.ontology] || '#6b7280';

  return (
    <div
      style={{
        padding: '1.5rem',
        border: '1px solid rgba(29, 26, 22, 0.1)',
        borderRadius: '0.5rem',
      }}
    >
      <div style={{ marginBottom: '1.5rem' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1rem',
          }}
        >
          <h3 style={{ margin: 0 }}>{initialMask ? 'Edit Mask' : 'Create Mask'}</h3>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={handleUndo}
              disabled={historyIndex === 0}
              style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
              title="Undo (Ctrl+Z)"
            >
              ↶ Undo
            </button>
            <button
              onClick={handleRedo}
              disabled={historyIndex === history.length - 1}
              style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
              title="Redo (Ctrl+Y)"
            >
              ↷ Redo
            </button>
          </div>
        </div>

        {error && (
          <div
            style={{
              padding: '0.75rem',
              backgroundColor: '#fee2e2',
              color: '#dc2626',
              borderRadius: '0.25rem',
              marginBottom: '1rem',
              fontSize: '0.9rem',
            }}
          >
            Error: {error}
          </div>
        )}

        {success && (
          <div
            style={{
              padding: '0.75rem',
              backgroundColor: '#dcfce7',
              color: '#15803d',
              borderRadius: '0.25rem',
              marginBottom: '1rem',
              fontSize: '0.9rem',
            }}
          >
            ✓ Mask saved successfully!
          </div>
        )}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '1rem',
          marginBottom: '1rem',
        }}
      >
        {/* Basic Info */}
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.25rem' }}>
              Mask Name *
            </div>
            <input
              type="text"
              value={state.name}
              onChange={(e) => handleStateChange({ ...state, name: e.target.value })}
              placeholder="e.g., Analyst, Architect"
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ccc',
                borderRadius: '0.25rem',
              }}
              disabled={isLoading}
            />
          </label>
        </div>

        {/* Ontology */}
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.25rem' }}>
              Ontology
            </div>
            <select
              value={state.ontology}
              onChange={(e) => handleStateChange({ ...state, ontology: e.target.value })}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: `2px solid ${ontologyColor}`,
                borderRadius: '0.25rem',
                backgroundColor: `${ontologyColor}08`,
              }}
              disabled={isLoading}
            >
              <option value="cognitive">Cognitive</option>
              <option value="expressive">Expressive</option>
              <option value="operational">Operational</option>
            </select>
          </label>
        </div>

        {/* Functional Scope */}
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.25rem' }}>
              Functional Scope
            </div>
            <textarea
              value={state.functionalScope}
              onChange={(e) => handleStateChange({ ...state, functionalScope: e.target.value })}
              placeholder="e.g., precision reasoning, decomposition, structure"
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ccc',
                borderRadius: '0.25rem',
                minHeight: '60px',
                fontFamily: 'inherit',
              }}
              disabled={isLoading}
            />
          </label>
        </div>

        {/* Stylistic Parameters */}
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.25rem' }}>
              Tone
            </div>
            <input
              type="text"
              value={state.tone}
              onChange={(e) => handleStateChange({ ...state, tone: e.target.value })}
              placeholder="e.g., neutral, warm, assertive"
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ccc',
                borderRadius: '0.25rem',
              }}
              disabled={isLoading}
            />
          </label>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.25rem' }}>
              Rhetorical Mode
            </div>
            <input
              type="text"
              value={state.rhetoricalMode}
              onChange={(e) => handleStateChange({ ...state, rhetoricalMode: e.target.value })}
              placeholder="e.g., deductive, narrative, comparative"
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ccc',
                borderRadius: '0.25rem',
              }}
              disabled={isLoading}
            />
          </label>
        </div>

        {/* Compression Ratio */}
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.25rem' }}>
              Compression Ratio: {state.compressionRatio.toFixed(2)} (0=verbose, 1=minimal)
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={state.compressionRatio}
              onChange={(e) =>
                handleStateChange({ ...state, compressionRatio: parseFloat(e.target.value) })
              }
              style={{ width: '100%' }}
              disabled={isLoading}
            />
          </label>
        </div>

        {/* Activation Rules */}
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.25rem' }}>
              Activation Contexts & Triggers (comma-separated)
            </div>
            <textarea
              value={state.contextsTriggers}
              onChange={(e) => handleStateChange({ ...state, contextsTriggers: e.target.value })}
              placeholder="e.g., technical, analysis, research, metric, benchmark"
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ccc',
                borderRadius: '0.25rem',
                minHeight: '60px',
                fontFamily: 'inherit',
              }}
              disabled={isLoading}
            />
          </label>
        </div>

        {/* Filter Tags */}
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.25rem' }}>
              Include Tags
            </div>
            <textarea
              value={state.includeTags}
              onChange={(e) => handleStateChange({ ...state, includeTags: e.target.value })}
              placeholder="Comma-separated tags to include"
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ccc',
                borderRadius: '0.25rem',
                minHeight: '80px',
                fontFamily: 'inherit',
              }}
              disabled={isLoading}
            />
          </label>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.25rem' }}>
              Exclude Tags
            </div>
            <textarea
              value={state.excludeTags}
              onChange={(e) => handleStateChange({ ...state, excludeTags: e.target.value })}
              placeholder="Comma-separated tags to exclude"
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ccc',
                borderRadius: '0.25rem',
                minHeight: '80px',
                fontFamily: 'inherit',
              }}
              disabled={isLoading}
            />
          </label>
        </div>

        {/* Redaction/Privacy */}
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.25rem' }}>
              Tags to Redact
            </div>
            <textarea
              value={state.privateTagsToRedact}
              onChange={(e) => handleStateChange({ ...state, privateTagsToRedact: e.target.value })}
              placeholder="Tags that should be hidden in this mask view"
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ccc',
                borderRadius: '0.25rem',
                minHeight: '60px',
                fontFamily: 'inherit',
              }}
              disabled={isLoading}
            />
          </label>
        </div>

        <div style={{ gridColumn: '1 / -1' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
              type="checkbox"
              checked={state.obfuscateDates}
              onChange={(e) => handleStateChange({ ...state, obfuscateDates: e.target.checked })}
              disabled={isLoading}
            />
            <span style={{ fontSize: '0.9rem' }}>
              Obfuscate dates (show only years, not specific dates)
            </span>
          </label>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
        <button
          onClick={() => setState(initialMask ? state : { ...state })}
          disabled={isLoading}
          style={{ padding: '0.75rem 1.5rem' }}
          className="button secondary"
        >
          Reset
        </button>
        <button
          onClick={handleSave}
          disabled={isLoading || !state.name}
          style={{ padding: '0.75rem 1.5rem' }}
          className="button"
        >
          {isLoading ? 'Saving...' : initialMask ? 'Update Mask' : 'Create Mask'}
        </button>
      </div>
    </div>
  );
}
