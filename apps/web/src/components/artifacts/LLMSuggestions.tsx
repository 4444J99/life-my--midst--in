'use client';

import type { Artifact } from '@in-midst-my-life/schema';
import { Sparkles } from 'lucide-react';

interface LLMSuggestionsProps {
  artifact: Artifact;
  onAcceptSuggestion?: (field: string, value: any) => void;
}

export function LLMSuggestions({
  artifact,
  onAcceptSuggestion: _onAcceptSuggestion,
}: LLMSuggestionsProps) {
  const hasSuggestions = artifact.confidence && artifact.confidence < 0.9;

  if (!hasSuggestions) {
    return null;
  }

  return (
    <div
      className="card"
      style={{
        padding: '1rem',
        backgroundColor: 'var(--color-bg-secondary)',
        border: '1px solid var(--color-border)',
      }}
    >
      <div
        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}
      >
        <Sparkles size={20} style={{ color: 'var(--color-primary)' }} />
        <h4 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600 }}>AI Suggestions</h4>
      </div>
      <p
        style={{
          fontSize: '0.875rem',
          color: 'var(--color-text-secondary)',
          marginBottom: '0.75rem',
        }}
      >
        Classification confidence: {Math.round((artifact.confidence || 0) * 100)}%
      </p>
      {artifact.confidence && artifact.confidence < 0.7 && (
        <p style={{ fontSize: '0.875rem', color: 'var(--color-warning)' }}>
          ⚠️ Low confidence. Please review the artifact type and metadata carefully.
        </p>
      )}
    </div>
  );
}
