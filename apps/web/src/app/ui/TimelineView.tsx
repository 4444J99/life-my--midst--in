'use client';

type TimelineEntry = {
  id: string;
  type: string;
  title: string;
  summary?: string;
  start: string;
  end?: string;
  tags?: string[];
  stageId?: string;
  settingId?: string;
};

type TimelineViewProps = {
  entries: TimelineEntry[];
  types: string[];
  tags: string[];
  settings: string[];
  settingLabels: Record<string, string>;
  selectedType: string;
  selectedTag: string;
  selectedSetting: string;
  onTypeChange: (type: string) => void;
  onTagChange: (tag: string) => void;
  onSettingChange: (setting: string) => void;
};

export function TimelineView({
  entries,
  types,
  tags,
  settings,
  settingLabels,
  selectedType,
  selectedTag,
  selectedSetting,
  onTypeChange,
  onTagChange,
  onSettingChange,
}: TimelineViewProps) {
  const filteredEntries = entries.filter((entry) => {
    if (selectedType !== 'all' && entry.type !== selectedType) return false;
    if (selectedTag !== 'all' && !entry.tags?.includes(selectedTag)) return false;
    if (selectedSetting !== 'all' && entry.settingId !== selectedSetting) return false;
    return true;
  });

  return (
    <section className="section">
      <h2 className="section-title">Timeline</h2>
      <p className="section-subtitle">Chronological view with stage/setting filters.</p>
      <div className="hero-actions" style={{ marginBottom: '1rem' }}>
        <select
          className="input"
          value={selectedType}
          onChange={(e) => onTypeChange(e.target.value)}
        >
          <option value="all">All Types</option>
          {types.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
        <select className="input" value={selectedTag} onChange={(e) => onTagChange(e.target.value)}>
          <option value="all">All Tags</option>
          {tags.map((tag) => (
            <option key={tag} value={tag}>
              {tag}
            </option>
          ))}
        </select>
        <select
          className="input"
          value={selectedSetting}
          onChange={(e) => onSettingChange(e.target.value)}
        >
          <option value="all">All Settings</option>
          {settings.map((setting) => (
            <option key={setting} value={setting}>
              {settingLabels[setting] || setting}
            </option>
          ))}
        </select>
      </div>
      <div className="stack">
        {filteredEntries.length === 0 ? (
          <div className="section-subtitle">No entries match the selected filters.</div>
        ) : (
          filteredEntries.map((entry) => (
            <div key={entry.id} className="stack-item">
              <strong>{entry.title}</strong>
              <div className="section-subtitle">
                {entry.start} {entry.end ? `→ ${entry.end}` : ''}
              </div>
              {entry.summary && <p style={{ margin: '0.5rem 0 0 0' }}>{entry.summary}</p>}
              {entry.tags && entry.tags.length > 0 && (
                <div className="chip-row" style={{ marginTop: '0.5rem' }}>
                  {entry.tags.map((tag) => (
                    <span key={tag} className="chip">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </section>
  );
}
