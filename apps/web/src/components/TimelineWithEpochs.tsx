'use client';

import { useMemo } from 'react';
import type { Epoch, Stage } from '@in-midst-my-life/schema';

/**
 * Enhanced timeline entry with narrative weighting support.
 * Extends the basic timeline entry with epoch/stage association and scoring.
 */
interface EnhancedTimelineEntry {
  id: string;
  type: string;
  title: string;
  summary?: string;
  start: string;
  end?: string;
  tags?: string[];
  settingId?: string;
  epochId?: string;
  stageId?: string;
  score?: number; // Narrative weight score (0-1)
}

interface TimelineWithEpochsProps {
  entries: EnhancedTimelineEntry[];
  epochs: Epoch[];
  stages: Stage[];
  types: string[];
  tags: string[];
  settings: string[];
  settingLabels: Record<string, string>;
  selectedType: string;
  selectedTag: string;
  selectedSetting: string;
  selectedEpoch: string;
  onTypeChange: (type: string) => void;
  onTagChange: (tag: string) => void;
  onSettingChange: (setting: string) => void;
  onEpochChange: (epochId: string) => void;
  sortByWeight?: boolean; // Enable narrative weight sorting
}

/**
 * Calculates a simple narrative weight score based on:
 * - Presence of summary (content richness)
 * - Number of tags (contextual depth)
 * - Position in epoch (recency within epoch)
 *
 * This is a lightweight version; full scoring via @in-midst-my-life/content-model/weighting
 */
const calculateEntryWeight = (
  entry: EnhancedTimelineEntry,
  epochIndex: number,
  totalEpochs: number,
): number => {
  let score = 0.5; // Base score

  // Content richness: presence of summary
  if (entry.summary && entry.summary.length > 0) {
    score += 0.2 * Math.min(entry.summary.length / 200, 1);
  }

  // Contextual depth: number of tags
  if (entry.tags && entry.tags.length > 0) {
    score += 0.15 * Math.min(entry.tags.length / 5, 1);
  }

  // Recency within epoch (later epochs weighted higher)
  score += 0.15 * (epochIndex / Math.max(totalEpochs - 1, 1));

  return Math.min(score, 1);
};

const formatRange = (start?: string, end?: string) => {
  if (!start && !end) return 'Date unknown';
  if (start && end) return `${start} - ${end}`;
  return `${start ?? end} - Present`;
};

/**
 * Enhanced Timeline component with epoch grouping, stage nesting, and narrative weighting.
 *
 * Features:
 * - Groups timeline entries by epoch with collapsible sections
 * - Shows stage hierarchy within epochs
 * - Optional narrative weight sorting (content richness, tag depth)
 * - Maintains existing filter functionality (type, tag, setting)
 * - Visual epoch indicators with order-based styling
 */
export function TimelineWithEpochs({
  entries,
  epochs,
  stages,
  types,
  tags,
  settings,
  settingLabels,
  selectedType,
  selectedTag,
  selectedSetting,
  selectedEpoch,
  onTypeChange,
  onTagChange,
  onSettingChange,
  onEpochChange,
  sortByWeight = false,
}: TimelineWithEpochsProps) {
  // Filter entries based on selected criteria
  const filteredEntries = useMemo(
    () =>
      entries.filter((entry) => {
        if (selectedType !== 'all' && entry.type !== selectedType) return false;
        if (selectedTag !== 'all' && !(entry.tags ?? []).includes(selectedTag)) return false;
        if (selectedSetting !== 'all' && entry.settingId !== selectedSetting) return false;
        if (selectedEpoch !== 'all' && entry.epochId !== selectedEpoch) return false;
        return true;
      }),
    [entries, selectedSetting, selectedTag, selectedType, selectedEpoch],
  );

  // Group entries by epoch and calculate scores
  const epochGroups = useMemo(() => {
    const grouped = new Map<string, EnhancedTimelineEntry[]>();

    // Initialize with all epochs
    epochs.forEach((epoch) => {
      grouped.set(epoch.id, []);
    });

    // Assign entries to epochs
    filteredEntries.forEach((entry) => {
      const epochId = entry.epochId || 'unassigned';
      if (!grouped.has(epochId)) {
        grouped.set(epochId, []);
      }
      grouped.get(epochId)!.push(entry);
    });

    // Calculate weights and sort if enabled
    const result = Array.from(grouped.entries()).map(([epochId, entries]) => {
      const epoch = epochs.find((e) => e.id === epochId);
      const epochIndex = epoch ? epochs.indexOf(epoch) : -1;

      const entriesWithScores = entries.map((entry) => ({
        ...entry,
        score: calculateEntryWeight(entry, epochIndex, epochs.length),
      }));

      if (sortByWeight) {
        entriesWithScores.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
      }

      return {
        epochId,
        epoch,
        entries: entriesWithScores,
      };
    });

    // Sort epoch groups by epoch order
    result.sort((a, b) => {
      if (!a.epoch && !b.epoch) return 0;
      if (!a.epoch) return 1;
      if (!b.epoch) return -1;
      return a.epoch.order - b.epoch.order;
    });

    return result;
  }, [filteredEntries, epochs, sortByWeight]);

  // Get unique epochs for filter dropdown
  const availableEpochs = useMemo(() => {
    const used = new Set<string>();
    filteredEntries.forEach((entry) => {
      if (entry.epochId) used.add(entry.epochId);
    });
    return epochs.filter((e) => used.has(e.id));
  }, [filteredEntries, epochs]);

  return (
    <section className="section">
      <h2 className="section-title">Timeline with Epoch Grouping</h2>
      <p className="section-subtitle">
        Explore your narrative journey organized by functional epochs. Filter by type, tag, setting,
        or specific epoch phase.
      </p>

      {/* Type Filter - Chip Row */}
      <div className="chip-row" style={{ marginBottom: '1rem' }}>
        <span className="chip active">Type</span>
        <button
          className={`chip ${selectedType === 'all' ? 'active' : ''}`}
          onClick={() => onTypeChange('all')}
        >
          All
        </button>
        {types.map((type) => (
          <button
            key={type}
            className={`chip ${selectedType === type ? 'active' : ''}`}
            onClick={() => onTypeChange(type)}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Multi-Select Filters - Grid */}
      <div
        className="grid"
        style={{ gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}
      >
        <label>
          <div className="label">Tag Filter</div>
          <select
            className="input"
            value={selectedTag}
            onChange={(event) => onTagChange(event.target.value)}
          >
            <option value="all">All Tags</option>
            {tags.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>
        </label>
        <label>
          <div className="label">Setting Filter</div>
          <select
            className="input"
            value={selectedSetting}
            onChange={(event) => onSettingChange(event.target.value)}
          >
            <option value="all">All Settings</option>
            {settings.map((setting) => (
              <option key={setting} value={setting}>
                {settingLabels[setting] ?? setting}
              </option>
            ))}
          </select>
        </label>
        <label>
          <div className="label">Epoch Filter</div>
          <select
            className="input"
            value={selectedEpoch}
            onChange={(event) => onEpochChange(event.target.value)}
          >
            <option value="all">All Epochs</option>
            {availableEpochs.map((epoch) => (
              <option key={epoch.id} value={epoch.id}>
                {epoch.name} (order {epoch.order})
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Sort indicator */}
      {sortByWeight && (
        <div style={{ marginBottom: '1rem', fontSize: '0.85rem', color: '#666' }}>
          📊 Sorted by narrative weight (content richness + context depth)
        </div>
      )}

      {/* Timeline with Epoch Grouping */}
      <div className="timeline" style={{ marginTop: '1rem' }}>
        {epochGroups.filter((group) => group.entries.length > 0).length === 0 ? (
          <div className="stat-card">No timeline entries match your filters.</div>
        ) : (
          epochGroups
            .filter((group) => group.entries.length > 0)
            .map((group) => {
              const epochColor = group.epoch
                ? ['#6366f1', '#d946ef', '#f59e0b', '#10b981', '#06b6d4', '#8b5cf6'][
                    group.epoch.order % 6
                  ]
                : '#6b7280';

              return (
                <details
                  key={group.epochId}
                  style={{
                    marginBottom: '1.5rem',
                    borderLeft: `4px solid ${epochColor}`,
                    paddingLeft: '1rem',
                  }}
                  open
                >
                  <summary
                    style={{
                      cursor: 'pointer',
                      fontWeight: 600,
                      marginBottom: '1rem',
                      fontSize: '1.05rem',
                    }}
                  >
                    {group.epoch ? (
                      <>
                        <span style={{ color: epochColor }}>●</span> {group.epoch.name} (
                        {group.epoch.order}
                        {group.entries.length > 0 && ` • ${group.entries.length} entry/entries`})
                      </>
                    ) : (
                      <>
                        <span style={{ color: epochColor }}>●</span> Unassigned (
                        {group.entries.length} entry/entries)
                      </>
                    )}
                  </summary>

                  {group.epoch && group.epoch.summary && (
                    <div
                      style={{
                        marginBottom: '1rem',
                        fontSize: '0.9rem',
                        color: '#555',
                        fontStyle: 'italic',
                      }}
                    >
                      {group.epoch.summary}
                    </div>
                  )}

                  {/* Entries within this epoch */}
                  <div style={{ paddingLeft: '0.5rem' }}>
                    {group.entries.map((entry) => {
                      const stage = stages.find((s) => s.id === entry.stageId);

                      return (
                        <div
                          key={entry.id}
                          className="timeline-item"
                          style={{
                            opacity: sortByWeight && entry.score ? 0.7 + entry.score * 0.3 : 1,
                            transition: 'opacity 0.2s',
                          }}
                        >
                          <div className="timeline-dot" />
                          <div>
                            <strong>{entry.title}</strong>
                            {sortByWeight && entry.score !== undefined && (
                              <span
                                style={{
                                  marginLeft: '0.5rem',
                                  fontSize: '0.75rem',
                                  backgroundColor: '#f3f4f6',
                                  padding: '0.25rem 0.5rem',
                                  borderRadius: '0.25rem',
                                  color: '#666',
                                }}
                              >
                                weight: {(entry.score * 100).toFixed(0)}%
                              </span>
                            )}
                            <div className="section-subtitle">
                              {formatRange(entry.start, entry.end)} | {entry.type}
                              {entry.settingId
                                ? ` | ${settingLabels[entry.settingId] ?? entry.settingId}`
                                : ''}
                              {stage && ` | Stage: ${stage.title}`}
                            </div>
                            {entry.summary ? (
                              <p style={{ margin: '0.5rem 0' }}>{entry.summary}</p>
                            ) : null}
                            {entry.tags && entry.tags.length > 0 ? (
                              <div className="chip-row">
                                {entry.tags.map((tag) => (
                                  <span key={`${entry.id}-${tag}`} className="chip">
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </details>
              );
            })
        )}
      </div>
    </section>
  );
}
