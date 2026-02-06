'use client';

/**
 * Scaenae Filter Component
 *
 * Stage-based Visibility Control - Show/hide masks and content based on theatrical stages
 * Part of the theatrical metaphor: "Stages" on which different masks perform
 *
 * Scaenae (Stages):
 * - Academica: Educational, research-driven contexts
 * - Technica: Technical, engineering-focused environments
 * - Artistica: Creative, expressive domains
 * - Civica: Public, civic engagement
 * - Domestica: Personal, intimate contexts
 * - Occulta: Private, fully redacted
 *
 * Features:
 * - Toggle stages on/off
 * - See which masks are visible on each stage
 * - Preview content filtered by stage
 * - Configure stage-specific narratives
 */

import { useState } from 'react';

export interface Stage {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export interface ScaenaeFilterProps {
  selectedStages: string[];
  onStagesChange: (stages: string[]) => void;
  allStages?: Stage[];
  visibilityMatrix?: Record<string, string[]>; // maskId -> visible stages
}

const DEFAULT_STAGES: Stage[] = [
  {
    id: 'academica',
    name: 'Academica',
    description: 'Educational, research-driven contexts',
    icon: '🎓',
  },
  {
    id: 'technica',
    name: 'Technica',
    description: 'Technical, engineering-focused environments',
    icon: '⚙️',
  },
  {
    id: 'artistica',
    name: 'Artistica',
    description: 'Creative, expressive domains',
    icon: '🎨',
  },
  {
    id: 'civica',
    name: 'Civica',
    description: 'Public, civic engagement',
    icon: '🏛️',
  },
  {
    id: 'domestica',
    name: 'Domestica',
    description: 'Personal, intimate contexts',
    icon: '🏠',
  },
  {
    id: 'occulta',
    name: 'Occulta',
    description: 'Private, fully redacted',
    icon: '🔒',
  },
];

/**
 * Main component
 */
export function ScaenaeFilter({
  selectedStages,
  onStagesChange,
  allStages = DEFAULT_STAGES,
  visibilityMatrix,
}: ScaenaeFilterProps) {
  const [_expandedStage, _setExpandedStage] = useState<string | null>(null);

  const toggleStage = (stageId: string) => {
    if (selectedStages.includes(stageId)) {
      onStagesChange(selectedStages.filter((s) => s !== stageId));
    } else {
      onStagesChange([...selectedStages, stageId]);
    }
  };

  const allSelected = selectedStages.length === allStages.length;
  const noneSelected = selectedStages.length === 0;

  return (
    <div className="scaenae-filter">
      <style jsx>{`
        .scaenae-filter {
          padding: 1.5rem;
          background: linear-gradient(135deg, rgba(17, 24, 39, 0.5) 0%, rgba(31, 41, 55, 0.3) 100%);
          border-radius: 12px;
          border: 1px solid rgba(107, 114, 128, 0.2);
        }

        .filter-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .filter-title {
          font-size: 1.1rem;
          font-weight: 600;
          color: rgba(229, 231, 235, 0.9);
          margin: 0;
        }

        .filter-controls {
          display: flex;
          gap: 0.5rem;
        }

        .filter-button {
          padding: 0.5rem 0.75rem;
          background: rgba(59, 130, 246, 0.1);
          border: 1px solid rgba(59, 130, 246, 0.3);
          border-radius: 4px;
          color: rgba(147, 197, 253, 0.8);
          cursor: pointer;
          font-size: 0.85rem;
          transition: all 0.2s ease;
        }

        .filter-button:hover {
          background: rgba(59, 130, 246, 0.2);
          border-color: rgba(59, 130, 246, 0.5);
        }

        .stages-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 0.75rem;
          margin-bottom: 1rem;
        }

        .stage-card {
          padding: 1rem;
          background: rgba(55, 65, 81, 0.5);
          border: 2px solid rgba(107, 114, 128, 0.3);
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
          user-select: none;
        }

        .stage-card:hover {
          background: rgba(75, 85, 99, 0.7);
          border-color: rgba(147, 154, 166, 0.5);
        }

        .stage-card.active {
          background: rgba(34, 197, 94, 0.15);
          border-color: rgba(34, 197, 94, 0.5);
          box-shadow: 0 0 12px rgba(34, 197, 94, 0.15);
        }

        .stage-icon {
          font-size: 2rem;
          margin-bottom: 0.5rem;
        }

        .stage-name {
          font-weight: 600;
          color: rgba(229, 231, 235, 0.9);
          margin: 0.5rem 0;
          font-size: 0.95rem;
        }

        .stage-description {
          font-size: 0.8rem;
          color: rgba(156, 163, 175, 0.7);
          margin: 0;
          line-height: 1.3;
        }

        .expanded-content {
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px solid rgba(107, 114, 128, 0.2);
        }

        .expanded-label {
          font-size: 0.85rem;
          font-weight: 500;
          color: rgba(209, 213, 219, 0.8);
          margin-bottom: 0.5rem;
        }

        .mask-list {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .mask-chip {
          padding: 0.4rem 0.75rem;
          background: rgba(59, 130, 246, 0.15);
          border: 1px solid rgba(59, 130, 246, 0.3);
          border-radius: 4px;
          color: rgba(191, 219, 254, 0.8);
          font-size: 0.8rem;
        }

        .visibility-summary {
          margin-top: 1.5rem;
          padding: 1rem;
          background: rgba(75, 85, 99, 0.4);
          border-radius: 8px;
          border-left: 3px solid rgba(59, 130, 246, 0.5);
        }

        .summary-title {
          font-size: 0.9rem;
          font-weight: 600;
          color: rgba(191, 219, 254, 0.9);
          margin: 0 0 0.5rem 0;
        }

        .summary-content {
          font-size: 0.85rem;
          color: rgba(156, 163, 175, 0.8);
          margin: 0;
        }
      `}</style>

      <div className="filter-header">
        <h2 className="filter-title">🎭 Theatrical Stages (Scaenae)</h2>
        <div className="filter-controls">
          <button
            className="filter-button"
            onClick={() => onStagesChange(allStages.map((s) => s.id))}
            disabled={allSelected}
          >
            Select All
          </button>
          <button
            className="filter-button"
            onClick={() => onStagesChange([])}
            disabled={noneSelected}
          >
            Clear All
          </button>
        </div>
      </div>

      <div className="stages-grid">
        {allStages.map((stage) => {
          const isActive = selectedStages.includes(stage.id);
          const visibleMasks = visibilityMatrix?.[stage.id] || [];

          return (
            <div
              key={stage.id}
              className={`stage-card ${isActive ? 'active' : ''}`}
              onClick={() => toggleStage(stage.id)}
            >
              <div className="stage-icon">{stage.icon}</div>
              <h3 className="stage-name">{stage.name}</h3>
              <p className="stage-description">{stage.description}</p>

              {isActive && visibleMasks.length > 0 && (
                <div className="expanded-content">
                  <p className="expanded-label">
                    {visibleMasks.length} mask{visibleMasks.length !== 1 ? 's' : ''} visible
                  </p>
                  <div className="mask-list">
                    {visibleMasks.slice(0, 3).map((maskId) => (
                      <span key={maskId} className="mask-chip">
                        {maskId}
                      </span>
                    ))}
                    {visibleMasks.length > 3 && (
                      <span className="mask-chip">+{visibleMasks.length - 3}</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {selectedStages.length > 0 && (
        <div className="visibility-summary">
          <p className="summary-title">📋 Summary</p>
          <p className="summary-content">
            {selectedStages.length === allStages.length
              ? 'All stages active - showing complete identity profile'
              : `${selectedStages.length} of ${allStages.length} stages selected - viewing filtered perspective`}
          </p>
          <p className="summary-content" style={{ marginTop: '0.5rem' }}>
            Active stages:{' '}
            {selectedStages.map((s) => allStages.find((st) => st.id === s)?.name).join(', ')}
          </p>
        </div>
      )}

      {selectedStages.length === 0 && (
        <div className="visibility-summary" style={{ borderLeftColor: 'rgba(239, 68, 68, 0.5)' }}>
          <p className="summary-title" style={{ color: 'rgba(252, 165, 165, 0.9)' }}>
            ⚠️ No Stages Selected
          </p>
          <p className="summary-content">
            Select at least one stage to preview your identity. Different stages reveal different
            perspectives of your professional self.
          </p>
        </div>
      )}
    </div>
  );
}

export default ScaenaeFilter;
