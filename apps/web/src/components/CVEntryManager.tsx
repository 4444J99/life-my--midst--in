'use client';

import { useState } from 'react';
import type { CVEntry, TabulaPersonarumEntry, Aetas, Scaena } from '@in-midst-my-life/schema';

interface CVEntryManagerProps {
  entries: CVEntry[];
  personas: TabulaPersonarumEntry[];
  aetas: Aetas[];
  scaenae: Scaena[];
  onAddEntry?: (entry: Omit<CVEntry, 'id'>) => void;
  onUpdateEntry?: (id: string, patch: Partial<CVEntry>) => void;
  onDeleteEntry?: (id: string) => void;
  loading?: boolean;
}

type CVEntryType =
  | 'experience'
  | 'achievement'
  | 'skill'
  | 'publication'
  | 'project'
  | 'education'
  | 'certification'
  | 'language'
  | 'volunteer'
  | 'award'
  | 'custom';

/**
 * CV Entry Manager with multi-dimensional tagging.
 *
 * Allows users to:
 * - Create, edit, delete CV entries
 * - Tag entries across 3 dimensions:
 *   - Personae (which masks)
 *   - Aetas (which life-stages)
 *   - Scaenae (which theatrical contexts)
 * - Set priority for filtering/sorting
 * - Filter entries by tags
 */
export function CVEntryManager({
  entries,
  personas,
  aetas,
  scaenae,
  onAddEntry,
  onUpdateEntry,
  onDeleteEntry,
  loading = false,
}: CVEntryManagerProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterPersonae, setFilterPersonae] = useState<Set<string>>(new Set());
  const [filterAetas, setFilterAetas] = useState<Set<string>>(new Set());
  const [filterScaenae, setFilterScaenae] = useState<Set<string>>(new Set());

  // Form state
  const [formData, setFormData] = useState({
    type: 'experience' as CVEntryType,
    content: '',
    priority: 50,
    personae: [] as string[],
    aetas: [] as string[],
    scaenae: [] as string[],
    tags: [] as string[],
    startDate: '',
    endDate: '',
  });

  const [tagsInput, setTagsInput] = useState('');

  if (loading) {
    return (
      <div className="section">
        <h2 className="section-title">CV Entry Manager</h2>
        <p className="section-subtitle">Loading entries...</p>
      </div>
    );
  }

  const entryTypes: { value: CVEntryType; label: string; emoji: string }[] = [
    { value: 'experience', label: 'Work Experience', emoji: '💼' },
    { value: 'education', label: 'Education', emoji: '🎓' },
    { value: 'project', label: 'Project', emoji: '🛠️' },
    { value: 'skill', label: 'Skill', emoji: '⚙️' },
    { value: 'publication', label: 'Publication', emoji: '📚' },
    { value: 'achievement', label: 'Achievement', emoji: '🏆' },
    { value: 'certification', label: 'Certification', emoji: '✓' },
    { value: 'award', label: 'Award', emoji: '🎖️' },
    { value: 'language', label: 'Language', emoji: '🌐' },
    { value: 'volunteer', label: 'Volunteer', emoji: '🤝' },
    { value: 'custom', label: 'Custom', emoji: '📌' },
  ];

  // Filter entries
  let filteredEntries = entries;
  if (filterPersonae.size > 0) {
    filteredEntries = filteredEntries.filter((e) => e.personae?.some((p) => filterPersonae.has(p)));
  }
  if (filterAetas.size > 0) {
    filteredEntries = filteredEntries.filter((e) => e.aetas?.some((a) => filterAetas.has(a)));
  }
  if (filterScaenae.size > 0) {
    filteredEntries = filteredEntries.filter((e) => e.scaenae?.some((s) => filterScaenae.has(s)));
  }

  const handleSubmit = () => {
    if (!formData.content.trim()) return;

    const entry: Omit<CVEntry, 'id'> = {
      ...formData,
      tags: tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    };

    if (editingId) {
      onUpdateEntry?.(editingId, entry);
      setEditingId(null);
    } else {
      onAddEntry?.(entry);
    }

    setShowForm(false);
    setFormData({
      type: 'experience',
      content: '',
      priority: 50,
      personae: [],
      aetas: [],
      scaenae: [],
      tags: [],
      startDate: '',
      endDate: '',
    });
    setTagsInput('');
  };

  const handleStartEdit = (entry: CVEntry) => {
    setFormData({
      type: entry.type as CVEntryType,
      content: entry.content,
      priority: entry.priority ?? 50,
      personae: entry.personae ?? [],
      aetas: entry.aetas ?? [],
      scaenae: entry.scaenae ?? [],
      tags: entry.tags ?? [],
      startDate: entry.startDate ?? '',
      endDate: entry.endDate ?? '',
    });
    setTagsInput((entry.tags ?? []).join(', '));
    setEditingId(entry.id);
    setShowForm(true);
  };

  const toggleFilterPersona = (personaId: string) => {
    const newSet = new Set(filterPersonae);
    if (newSet.has(personaId)) {
      newSet.delete(personaId);
    } else {
      newSet.add(personaId);
    }
    setFilterPersonae(newSet);
  };

  const toggleFilterAetas = (aetasId: string) => {
    const newSet = new Set(filterAetas);
    if (newSet.has(aetasId)) {
      newSet.delete(aetasId);
    } else {
      newSet.add(aetasId);
    }
    setFilterAetas(newSet);
  };

  const toggleFilterScaena = (scaenaId: string) => {
    const newSet = new Set(filterScaenae);
    if (newSet.has(scaenaId)) {
      newSet.delete(scaenaId);
    } else {
      newSet.add(scaenaId);
    }
    setFilterScaenae(newSet);
  };

  return (
    <div className="section">
      <h2 className="section-title">Curriculum Vitae Entries</h2>
      <p className="section-subtitle">
        Manage your master CV with multi-dimensional tagging across theatrical contexts.
      </p>

      {/* Add/Edit Form */}
      {showForm && (
        <div
          style={{
            background: 'rgba(211, 107, 60, 0.05)',
            border: '1px solid rgba(211, 107, 60, 0.2)',
            padding: '1.5rem',
            marginBottom: '1.5rem',
            borderRadius: '4px',
          }}
        >
          <h3 style={{ marginTop: 0 }}>{editingId ? 'Edit Entry' : 'Add New Entry'}</h3>

          <div style={{ display: 'grid', gap: '1rem' }}>
            {/* Entry Type */}
            <div>
              <label className="label">Entry Type</label>
              <select
                className="input"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as CVEntryType })}
              >
                {entryTypes.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.emoji} {t.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Content */}
            <div>
              <label className="label">Content / Description</label>
              <textarea
                className="input"
                rows={4}
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Describe this entry..."
              />
            </div>

            {/* Priority */}
            <div>
              <label className="label">Priority: {formData.priority}%</label>
              <input
                type="range"
                min="0"
                max="100"
                value={formData.priority}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    priority: parseInt(e.target.value, 10),
                  })
                }
                style={{ width: '100%' }}
              />
            </div>

            {/* Dates */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label className="label">Start Date</label>
                <input
                  type="date"
                  className="input"
                  value={formData.startDate}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      startDate: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <label className="label">End Date</label>
                <input
                  type="date"
                  className="input"
                  value={formData.endDate}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      endDate: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            {/* Personas */}
            <div>
              <label className="label">Theatrical Masks (Personae)</label>
              <div className="chip-row" style={{ gap: '0.5rem' }}>
                {personas.map((persona) => (
                  <label
                    key={persona.id}
                    className="label"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      padding: '0.5rem',
                      background: formData.personae.includes(persona.id)
                        ? 'rgba(211, 107, 60, 0.1)'
                        : 'transparent',
                      borderRadius: '4px',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={formData.personae.includes(persona.id)}
                      onChange={(e) => {
                        const newPersonae = e.target.checked
                          ? [...formData.personae, persona.id]
                          : formData.personae.filter((p) => p !== persona.id);
                        setFormData({ ...formData, personae: newPersonae });
                      }}
                    />
                    {persona.everyday_name}
                  </label>
                ))}
              </div>
            </div>

            {/* Aetas */}
            <div>
              <label className="label">Life Stages (Aetas)</label>
              <div className="chip-row" style={{ gap: '0.5rem', flexWrap: 'wrap' }}>
                {aetas.map((aeta) => (
                  <label
                    key={aeta.id}
                    className="label"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      padding: '0.5rem',
                      background: formData.aetas.includes(aeta.id)
                        ? 'rgba(63, 81, 181, 0.1)'
                        : 'transparent',
                      borderRadius: '4px',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={formData.aetas.includes(aeta.id)}
                      onChange={(e) => {
                        const newAetas = e.target.checked
                          ? [...formData.aetas, aeta.id]
                          : formData.aetas.filter((a) => a !== aeta.id);
                        setFormData({ ...formData, aetas: newAetas });
                      }}
                    />
                    {aeta.name}
                  </label>
                ))}
              </div>
            </div>

            {/* Scaenae */}
            <div>
              <label className="label">Theatrical Stages (Scaenae)</label>
              <div className="chip-row" style={{ gap: '0.5rem', flexWrap: 'wrap' }}>
                {scaenae.map((scaena) => (
                  <label
                    key={scaena.id}
                    className="label"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      padding: '0.5rem',
                      background: formData.scaenae.includes(scaena.id)
                        ? 'rgba(76, 175, 80, 0.1)'
                        : 'transparent',
                      borderRadius: '4px',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={formData.scaenae.includes(scaena.id)}
                      onChange={(e) => {
                        const newScaenae = e.target.checked
                          ? [...formData.scaenae, scaena.id]
                          : formData.scaenae.filter((s) => s !== scaena.id);
                        setFormData({ ...formData, scaenae: newScaenae });
                      }}
                    />
                    {scaena.name}
                  </label>
                ))}
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="label">Custom Tags (comma-separated)</label>
              <input
                type="text"
                className="input"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="e.g., leadership, impact, research"
              />
            </div>

            {/* Actions */}
            <div className="hero-actions">
              <button className="button" onClick={handleSubmit}>
                {editingId ? 'Update Entry' : 'Add Entry'}
              </button>
              <button
                className="button ghost"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Entry Button */}
      {!showForm && (
        <div style={{ marginBottom: '1.5rem' }}>
          <button className="button" onClick={() => setShowForm(true)}>
            + Add CV Entry
          </button>
        </div>
      )}

      {/* Filters */}
      <div
        style={{
          background: 'rgba(29, 26, 22, 0.02)',
          padding: '1rem',
          marginBottom: '1.5rem',
          borderRadius: '4px',
        }}
      >
        <div className="label" style={{ marginBottom: '0.75rem' }}>
          Filter by Dimensions
        </div>

        {personas.length > 0 && (
          <div style={{ marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: '600' }}>Personae:</span>
            <div className="chip-row" style={{ gap: '0.3rem', marginTop: '0.3rem' }}>
              {personas.map((persona) => (
                <span
                  key={persona.id}
                  className="chip"
                  onClick={() => toggleFilterPersona(persona.id)}
                  style={{
                    cursor: 'pointer',
                    background: filterPersonae.has(persona.id)
                      ? 'var(--accent)'
                      : 'rgba(29, 26, 22, 0.08)',
                    color: filterPersonae.has(persona.id) ? '#fff' : 'var(--dark)',
                    fontSize: '0.8rem',
                  }}
                >
                  {persona.everyday_name}
                </span>
              ))}
            </div>
          </div>
        )}

        {aetas.length > 0 && (
          <div style={{ marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: '600' }}>Aetas:</span>
            <div className="chip-row" style={{ gap: '0.3rem', marginTop: '0.3rem' }}>
              {aetas.map((aeta) => (
                <span
                  key={aeta.id}
                  className="chip"
                  onClick={() => toggleFilterAetas(aeta.id)}
                  style={{
                    cursor: 'pointer',
                    background: filterAetas.has(aeta.id) ? '#3F51B5' : 'rgba(29, 26, 22, 0.08)',
                    color: filterAetas.has(aeta.id) ? '#fff' : 'var(--dark)',
                    fontSize: '0.8rem',
                  }}
                >
                  {aeta.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {scaenae.length > 0 && (
          <div>
            <span style={{ fontSize: '0.9rem', fontWeight: '600' }}>Scaenae:</span>
            <div className="chip-row" style={{ gap: '0.3rem', marginTop: '0.3rem' }}>
              {scaenae.map((scaena) => (
                <span
                  key={scaena.id}
                  className="chip"
                  onClick={() => toggleFilterScaena(scaena.id)}
                  style={{
                    cursor: 'pointer',
                    background: filterScaenae.has(scaena.id) ? '#4CAF50' : 'rgba(29, 26, 22, 0.08)',
                    color: filterScaenae.has(scaena.id) ? '#fff' : 'var(--dark)',
                    fontSize: '0.8rem',
                  }}
                >
                  {scaena.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {(filterPersonae.size > 0 || filterAetas.size > 0 || filterScaenae.size > 0) && (
          <button
            className="button ghost"
            onClick={() => {
              setFilterPersonae(new Set());
              setFilterAetas(new Set());
              setFilterScaenae(new Set());
            }}
            style={{ marginTop: '0.75rem', fontSize: '0.85rem' }}
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Entries List */}
      {filteredEntries.length === 0 ? (
        <div className="stat-card">
          <p className="section-subtitle">
            {entries.length === 0
              ? 'No CV entries yet. Add your first entry to begin building your curriculum vitae.'
              : 'No entries match the current filters.'}
          </p>
        </div>
      ) : (
        <div className="stack" style={{ gap: '0.75rem' }}>
          {filteredEntries.map((entry) => {
            const entryType = entryTypes.find((t) => t.value === entry.type);

            return (
              <div key={entry.id} className="stat-card">
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '1.2rem' }}>{entryType?.emoji}</span>
                      <div>
                        <div className="label" style={{ margin: 0, marginBottom: '0.2rem' }}>
                          {entryType?.label}
                        </div>
                        <div style={{ fontSize: '0.9rem', color: 'var(--stone)' }}>
                          Priority: {entry.priority}%{' '}
                          {entry.startDate && `• ${new Date(entry.startDate).toLocaleDateString()}`}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      className="button ghost"
                      onClick={() => handleStartEdit(entry)}
                      style={{ fontSize: '0.85rem' }}
                    >
                      Edit
                    </button>
                    <button
                      className="button ghost"
                      onClick={() => onDeleteEntry?.(entry.id)}
                      style={{ fontSize: '0.85rem', color: '#F44336' }}
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {/* Content preview */}
                <p className="section-subtitle" style={{ margin: '0 0 0.75rem 0' }}>
                  {entry.content.substring(0, 200)}
                  {entry.content.length > 200 ? '...' : ''}
                </p>

                {/* Tags */}
                {(entry.personae?.length ||
                  entry.aetas?.length ||
                  entry.scaenae?.length ||
                  entry.tags?.length) && (
                  <div className="chip-row" style={{ gap: '0.3rem', flexWrap: 'wrap' }}>
                    {entry.personae?.map((p) => {
                      const persona = personas.find((pr) => pr.id === p);
                      return persona ? (
                        <span
                          key={p}
                          className="chip"
                          style={{
                            fontSize: '0.75rem',
                            background: 'rgba(211, 107, 60, 0.15)',
                            color: '#D36B3C',
                          }}
                        >
                          {persona.everyday_name}
                        </span>
                      ) : null;
                    })}
                    {entry.aetas?.map((a) => {
                      const aeta = aetas.find((ae) => ae.id === a);
                      return aeta ? (
                        <span
                          key={a}
                          className="chip"
                          style={{
                            fontSize: '0.75rem',
                            background: 'rgba(63, 81, 181, 0.15)',
                            color: '#3F51B5',
                          }}
                        >
                          {aeta.name}
                        </span>
                      ) : null;
                    })}
                    {entry.scaenae?.map((s) => {
                      const scaena = scaenae.find((sc) => sc.id === s);
                      return scaena ? (
                        <span
                          key={s}
                          className="chip"
                          style={{
                            fontSize: '0.75rem',
                            background: 'rgba(76, 175, 80, 0.15)',
                            color: '#4CAF50',
                          }}
                        >
                          {scaena.name}
                        </span>
                      ) : null;
                    })}
                    {entry.tags?.map((tag) => (
                      <span
                        key={tag}
                        className="chip"
                        style={{
                          fontSize: '0.75rem',
                          background: 'rgba(255, 193, 7, 0.15)',
                          color: '#FFC107',
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default CVEntryManager;
