'use client';

import { MASK_TAXONOMY } from '@in-midst-my-life/content-model';

interface MaskSelectorProps {
  value: string;
  onChange: (id: string) => void;
}

/**
 * Displays all 16 identity masks from the taxonomy.
 * Groups masks by ontology (cognitive, expressive, operational)
 * and allows selection of the active mask identity.
 */
export function MaskSelector({ value, onChange }: MaskSelectorProps) {
  const ontologies = ['cognitive', 'expressive', 'operational'] as const;

  return (
    <div className="section" style={{ padding: '1.2rem' }}>
      <div className="label" style={{ marginBottom: '1rem' }}>
        Active Mask Identity
      </div>
      {ontologies.map((ontology) => {
        const masksInOntology = MASK_TAXONOMY.filter((m) => m.ontology === ontology);
        return (
          <div key={ontology} style={{ marginBottom: '1.5rem' }}>
            <div
              className="section-subtitle"
              style={{
                fontSize: '0.8rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '0.5rem',
                color: 'var(--stone)',
              }}
            >
              {ontology}
            </div>
            <div className="grid two" style={{ gap: '0.75rem' }}>
              {masksInOntology.map((mask) => (
                <div
                  key={mask.id}
                  onClick={() => onChange(mask.id)}
                  className={`stat-card ${value === mask.id ? 'active' : ''}`}
                  style={{
                    cursor: 'pointer',
                    border:
                      value === mask.id
                        ? '2px solid var(--accent)'
                        : '1px solid rgba(29, 26, 22, 0.08)',
                    background: value === mask.id ? 'rgba(211, 107, 60, 0.05)' : '#fff',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                  }}
                >
                  <div
                    className="stat-label"
                    style={{ color: value === mask.id ? 'var(--accent)' : 'var(--stone)' }}
                  >
                    {mask.id}
                  </div>
                  <div
                    className="stat-value"
                    style={{ fontSize: '1.2rem', marginBottom: '0.2rem' }}
                  >
                    {mask.name}
                  </div>
                  <div className="section-subtitle" style={{ fontSize: '0.85rem', margin: 0 }}>
                    {mask.functional_scope}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
