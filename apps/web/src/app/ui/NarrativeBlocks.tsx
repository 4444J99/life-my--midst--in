'use client';

import type { NarrativeBlock } from './client-dashboard';

type NarrativeBlocksProps = {
  blocks: NarrativeBlock[];
  draftId: string;
  status: string;
  maskId: string;
  contexts: string;
  tags: string;
  masks: Array<{ id: string; name: string }>;
  onMaskChange: (maskId: string) => void;
  onContextsChange: (contexts: string) => void;
  onTagsChange: (tags: string) => void;
  onGenerate: () => void;
  onClear: () => void;
  onApprove: () => void;
  onSaveDraft: (blocks: NarrativeBlock[], note?: string) => void;
};

export function NarrativeBlocks({
  blocks,
  draftId,
  status,
  maskId,
  contexts,
  tags,
  masks,
  onMaskChange,
  onContextsChange,
  onTagsChange,
  onGenerate,
  onClear,
  onApprove,
}: NarrativeBlocksProps) {
  return (
    <section className="section">
      <h2 className="section-title">Narrative Preview</h2>
      <p className="section-subtitle">Generate narrative blocks with mask/context filters.</p>
      <div className="stat-card">
        <div style={{ display: 'grid', gap: '0.5rem', marginBottom: '1rem' }}>
          <label className="label">Mask</label>
          <select className="input" value={maskId} onChange={(e) => onMaskChange(e.target.value)}>
            <option value="">Default</option>
            {masks.map((mask) => (
              <option key={mask.id} value={mask.id}>
                {mask.name}
              </option>
            ))}
          </select>
          <label className="label">Contexts (comma-separated)</label>
          <input
            className="input"
            value={contexts}
            onChange={(e) => onContextsChange(e.target.value)}
            placeholder="design, architecture"
          />
          <label className="label">Tags (comma-separated)</label>
          <input
            className="input"
            value={tags}
            onChange={(e) => onTagsChange(e.target.value)}
            placeholder="impact, craft"
          />
        </div>
        <div className="hero-actions" style={{ marginBottom: '1rem' }}>
          <button className="button" onClick={onGenerate}>
            Generate
          </button>
          <button className="button ghost" onClick={onClear}>
            Clear
          </button>
          {status && <span className="section-subtitle">Status: {status}</span>}
        </div>
        {blocks.length > 0 && (
          <>
            <div className="stack" style={{ marginTop: '1rem' }}>
              {blocks.map((block, idx) => (
                <div key={idx} className="stack-item">
                  <strong>{block.title}</strong>
                  <p style={{ margin: '0.5rem 0 0 0' }}>{block.body}</p>
                  {block.tags && block.tags.length > 0 && (
                    <div className="chip-row" style={{ marginTop: '0.5rem' }}>
                      {block.tags.map((tag) => (
                        <span key={tag} className="chip">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            {draftId && status !== 'approved' && (
              <div className="hero-actions" style={{ marginTop: '1rem' }}>
                <button className="button secondary" onClick={onApprove}>
                  Approve Narrative
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
