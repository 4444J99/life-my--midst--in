'use client';

/**
 * Aetas Timeline Component
 * 
 * Interactive D3.js Timeline Visualization of Professional Epochs
 * Part of the theatrical metaphor: "Aetas" = ages/seasons of life
 * 
 * Shows temporal progression through career stages:
 * - Initiation → Emergence → Consolidation → Divergence
 * - Mastery → Reinvention → Transmission → Legacy
 * 
 * Features:
 * - Drag-to-explore timeline
 * - Click to focus on specific epoch
 * - Show key milestones and inflection points
 * - Visualize mask activity across epochs
 * - Animated transitions between views
 */

import { useEffect, useRef, useState, useMemo } from 'react';

export interface Epoch {
  id: string;
  name: string;
  description: string;
  startDate: Date;
  endDate?: Date;
  milestones: string[];
  inflectionPoints: string[];
  activeMasks?: string[];
  color?: string;
}

export interface AetasTimelineProps {
  epochs: Epoch[];
  selectedEpoch?: string;
  onEpochSelected?: (epochId: string) => void;
  height?: number;
  animated?: boolean;
}

/**
 * Main component with D3 visualization
 */
export function AetasTimeline({
  epochs,
  selectedEpoch,
  onEpochSelected,
  height = 400,
  animated = true,
}: AetasTimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredEpoch, setHoveredEpoch] = useState<string | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(900);

  // Set up responsive width tracking
  useEffect(() => {
    if (!containerRef.current) return;

    // Initial measurement
    setContainerWidth(containerRef.current.offsetWidth - 48); // Subtract padding

    // Watch for resize
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentRect.width - 48; // Subtract padding
        setContainerWidth(Math.max(width, 300)); // Minimum 300px
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Calculate timeline dimensions based on dates
  const timelineMetrics = useMemo(() => {
    if (epochs.length === 0) return { minDate: new Date(), maxDate: new Date(), svgWidth: containerWidth };

    const dates = epochs.flatMap(e => [e.startDate, e.endDate || new Date()]);
    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));

    // Add padding (10% on each side)
    const timespan = maxDate.getTime() - minDate.getTime();
    const padding = timespan * 0.1;
    const paddedMinDate = new Date(minDate.getTime() - padding);
    const paddedMaxDate = new Date(maxDate.getTime() + padding);

    const pixelsPerDay = Math.max(1, (containerWidth - 100) / ((paddedMaxDate.getTime() - paddedMinDate.getTime()) / (1000 * 60 * 60 * 24)));

    return {
      minDate: paddedMinDate,
      maxDate: paddedMaxDate,
      svgWidth: containerWidth,
      pixelsPerDay,
    };
  }, [epochs, containerWidth]);

  // Helper function to convert date to x position
  const dateToX = (date: Date): number => {
    const timespan = timelineMetrics.maxDate.getTime() - timelineMetrics.minDate.getTime();
    const elapsed = date.getTime() - timelineMetrics.minDate.getTime();
    return 50 + (elapsed / timespan) * (timelineMetrics.svgWidth - 100);
  };

  if (epochs.length === 0) {
    return (
      <div className="aetas-timeline-empty">
        <style jsx>{`
          .aetas-timeline-empty {
            padding: 3rem 1rem;
            text-align: center;
            color: rgba(156, 163, 175, 0.7);
            background: linear-gradient(135deg, rgba(17, 24, 39, 0.5) 0%, rgba(31, 41, 55, 0.3) 100%);
            border-radius: 12px;
            border: 1px dashed rgba(107, 114, 128, 0.3);
          }

          .empty-message {
            margin: 0;
            font-size: 1rem;
          }
        `}</style>
        <p className="empty-message">
          No epochs yet. Start adding life stages to visualize your professional journey.
        </p>
      </div>
    );
  }

  return (
    <div className="aetas-timeline-container" ref={containerRef}>
      <style jsx>{`
        .aetas-timeline-container {
          padding: 1.5rem;
          background: linear-gradient(135deg, rgba(17, 24, 39, 0.5) 0%, rgba(31, 41, 55, 0.3) 100%);
          border-radius: 12px;
          border: 1px solid rgba(107, 114, 128, 0.2);
        }

        .timeline-title {
          font-size: 1.1rem;
          font-weight: 600;
          color: rgba(229, 231, 235, 0.9);
          margin: 0 0 1.5rem 0;
        }

        .timeline-svg {
          width: 100%;
          height: auto;
          overflow: visible;
        }

        .epoch-block {
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .epoch-block:hover {
          opacity: 1;
          filter: brightness(1.2);
        }

        .epoch-block.active {
          stroke: rgba(59, 130, 246, 0.8);
          stroke-width: 3;
          filter: drop-shadow(0 0 8px rgba(59, 130, 246, 0.4));
        }

        .epoch-label {
          font-size: 0.85rem;
          font-weight: 500;
          fill: rgba(229, 231, 235, 0.9);
          pointer-events: none;
        }

        .epoch-date {
          font-size: 0.75rem;
          fill: rgba(156, 163, 175, 0.7);
          pointer-events: none;
        }

        .milestone-marker {
          fill: rgba(34, 197, 94, 0.6);
          stroke: rgba(34, 197, 94, 0.8);
        }

        .inflection-marker {
          fill: rgba(239, 68, 68, 0.6);
          stroke: rgba(239, 68, 68, 0.8);
        }

        .mask-indicator {
          fill: rgba(147, 197, 253, 0.5);
          stroke: rgba(59, 130, 246, 0.7);
          font-size: 0.7rem;
        }

        .timeline-legend {
          display: flex;
          gap: 1.5rem;
          margin-top: 1.5rem;
          padding-top: 1rem;
          border-top: 1px solid rgba(107, 114, 128, 0.2);
          flex-wrap: wrap;
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.85rem;
          color: rgba(156, 163, 175, 0.8);
        }

        .legend-marker {
          width: 12px;
          height: 12px;
          border-radius: 2px;
        }

        .detail-panel {
          margin-top: 1.5rem;
          padding: 1rem;
          background: rgba(75, 85, 99, 0.4);
          border-radius: 8px;
          border-left: 3px solid rgba(59, 130, 246, 0.5);
        }

        .detail-title {
          font-weight: 600;
          color: rgba(229, 231, 235, 0.9);
          margin: 0 0 0.75rem 0;
        }

        .detail-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .detail-list li {
          padding: 0.5rem 0;
          color: rgba(156, 163, 175, 0.8);
          font-size: 0.9rem;
          border-bottom: 1px solid rgba(107, 114, 128, 0.1);
        }

        .detail-list li:last-child {
          border-bottom: none;
        }
      `}</style>

      <h2 className="timeline-title">📅 Professional Epochs (Aetas)</h2>

      {/* Interactive Timeline SVG */}
      <svg
        ref={svgRef}
        className="timeline-svg"
        height={height}
        viewBox={`0 0 ${timelineMetrics.svgWidth} ${height}`}
        preserveAspectRatio="none"
      >
        {/* Background grid */}
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(107, 114, 128, 0.1)" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />

        {/* Epoch blocks - date-based positioning */}
        {epochs.map((epoch, index) => {
          const x1 = dateToX(epoch.startDate);
          const x2 = dateToX(epoch.endDate || new Date());
          const width = Math.max(x2 - x1, 60); // Minimum 60px width for visibility
          const x = x1;
          const y = height / 2 - 30;
          const isSelected = selectedEpoch === epoch.id;
          const isHovered = hoveredEpoch === epoch.id;
          const color = epoch.color || `hsl(${index * 45}, 70%, 55%)`;

          return (
            <g
              key={epoch.id}
              className={`epoch-block ${isSelected ? 'active' : ''}`}
              onClick={() => onEpochSelected?.(epoch.id)}
              onMouseEnter={() => setHoveredEpoch(epoch.id)}
              onMouseLeave={() => setHoveredEpoch(null)}
              style={{
                cursor: 'pointer',
                opacity: isHovered || isSelected ? 1 : 0.7,
                transition: animated ? 'all 0.2s ease' : 'none',
              }}
            >
              {/* Epoch rectangle - sized by actual date range */}
              <rect
                x={x}
                y={y}
                width={width}
                height="60"
                fill={color}
                opacity={isHovered ? 0.8 : 0.6}
                rx="4"
                stroke={isSelected ? 'rgba(59, 130, 246, 0.8)' : 'rgba(107, 114, 128, 0.4)'}
                strokeWidth={isSelected ? 3 : 1}
                style={{
                  transition: animated ? 'all 0.2s ease' : 'none',
                  filter: isHovered ? 'brightness(1.2)' : 'brightness(1)',
                }}
              />

              {/* Epoch label */}
              <text
                x={x + width / 2}
                y={y + 25}
                textAnchor="middle"
                className="epoch-label"
                style={{
                  fontSize: width < 80 ? '0.7rem' : '0.85rem',
                  pointerEvents: 'none',
                }}
              >
                {width > 60 ? epoch.name : epoch.name.substring(0, 3)}
              </text>

              {/* Date range */}
              {width > 80 && (
                <text
                  x={x + width / 2}
                  y={y + 45}
                  textAnchor="middle"
                  className="epoch-date"
                  style={{ pointerEvents: 'none' }}
                >
                  {epoch.startDate.getFullYear()}
                  {epoch.endDate && ` - ${epoch.endDate.getFullYear()}`}
                </text>
              )}

              {/* Milestone count indicator */}
              {epoch.milestones.length > 0 && (
                <circle
                  cx={x + width - 8}
                  cy={y}
                  r="5"
                  className="milestone-marker"
                  style={{ pointerEvents: 'none' }}
                />
              )}

              {/* Inflection point indicators */}
              {epoch.inflectionPoints.length > 0 && (
                <circle
                  cx={x + width - 20}
                  cy={y}
                  r="4"
                  className="inflection-marker"
                  style={{ pointerEvents: 'none' }}
                />
              )}
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="timeline-legend">
        <div className="legend-item">
          <div className="legend-marker" style={{ background: 'rgba(34, 197, 94, 0.6)' }}></div>
          <span>Milestones</span>
        </div>
        <div className="legend-item">
          <div className="legend-marker" style={{ background: 'rgba(239, 68, 68, 0.6)' }}></div>
          <span>Inflection Points</span>
        </div>
        <div className="legend-item">
          <div className="legend-marker" style={{ background: 'rgba(147, 197, 253, 0.5)' }}></div>
          <span>Mask Activity</span>
        </div>
      </div>

      {/* Detail panel for selected epoch */}
      {selectedEpoch && epochs.find((e) => e.id === selectedEpoch) && (
        <div className="detail-panel">
          <div>
            {(() => {
              const epoch = epochs.find((e) => e.id === selectedEpoch)!;
              return (
                <>
                  <h3 className="detail-title">{epoch.name}</h3>
                  <p style={{ margin: '0 0 1rem 0', color: 'rgba(156, 163, 175, 0.8)', fontSize: '0.9rem' }}>
                    {epoch.description}
                  </p>

                  {epoch.milestones.length > 0 && (
                    <div style={{ marginBottom: '1rem' }}>
                      <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: 'rgba(209, 213, 219, 0.8)' }}>
                        Key Milestones
                      </h4>
                      <ul className="detail-list">
                        {epoch.milestones.map((milestone, idx) => (
                          <li key={idx}>✓ {milestone}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {epoch.inflectionPoints.length > 0 && (
                    <div style={{ marginBottom: '1rem' }}>
                      <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: 'rgba(209, 213, 219, 0.8)' }}>
                        Inflection Points
                      </h4>
                      <ul className="detail-list">
                        {epoch.inflectionPoints.map((point, idx) => (
                          <li key={idx}>⚡ {point}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {epoch.activeMasks && epoch.activeMasks.length > 0 && (
                    <div>
                      <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: 'rgba(209, 213, 219, 0.8)' }}>
                        Active Masks
                      </h4>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {epoch.activeMasks.map((mask) => (
                          <span
                            key={mask}
                            style={{
                              padding: '0.4rem 0.75rem',
                              background: 'rgba(59, 130, 246, 0.15)',
                              border: '1px solid rgba(59, 130, 246, 0.3)',
                              borderRadius: '4px',
                              color: 'rgba(191, 219, 254, 0.8)',
                              fontSize: '0.8rem',
                            }}
                          >
                            {mask}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}

export default AetasTimeline;
