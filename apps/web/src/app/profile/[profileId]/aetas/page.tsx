'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Edit2, Trash2, Calendar, BookOpen } from 'lucide-react';
import { useAetas } from '@/hooks/useAetas';
import type { Aetas } from '@in-midst-my-life/schema';
import { NeoCard } from '@in-midst-my-life/design-system';

interface PageProps {
  params: {
    profileId: string;
  };
}

const AETA_EMOJIS: Record<number, string> = {
  0: '🌱',
  1: '🌿',
  2: '🌳',
  3: '🚀',
  4: '👑',
  5: '🔮',
  6: '📖',
  7: '🛡️',
};

const AETA_LABELS = [
  'Initiation',
  'Emergence',
  'Consolidation',
  'Divergence',
  'Mastery',
  'Reinvention',
  'Transmission',
  'Legacy',
];

export default function AetasEditorPage({ params }: PageProps) {
  const { profileId } = params;
  const {
    canonicalAetas,
    profileAetas,
    currentAetasId,
    loading,
    error,
    addProfileAetas,
    updateProfileAetas,
    deleteProfileAetas,
    setCurrentAetas,
  } = useAetas(profileId);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Aetas>>({});
  const [showForm, setShowForm] = useState(false);

  // Calculate aetas index for display
  const getAetasIndex = (aeta: Aetas) => {
    return canonicalAetas.findIndex((ca) => ca.name === aeta.name);
  };

  // Start editing
  const handleEdit = (aeta: Aetas) => {
    setEditingId(aeta.id);
    setFormData(aeta);
    setShowForm(true);
  };

  // Submit form (add or update)
  const handleSubmit = async () => {
    if (!formData.name) {
      alert('Name is required');
      return;
    }

    try {
      if (editingId) {
        await updateProfileAetas(editingId, formData);
      } else {
        await addProfileAetas({
          name: formData.name,
          description: formData.description || '',
          typical_age_range: formData.typical_age_range,
          duration_months: formData.duration_months,
        } as Omit<Aetas, 'id'>);
      }
      resetForm();
    } catch (err) {
      console.error('Error saving aeta:', err);
      alert('Failed to save aeta');
    }
  };

  // Delete aeta
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this stage?')) {
      return;
    }

    try {
      await deleteProfileAetas(id);
    } catch (err) {
      console.error('Error deleting aeta:', err);
      alert('Failed to delete aeta');
    }
  };

  // Set as current aeta
  const handleSetCurrent = (id: string) => {
    try {
      setCurrentAetas(id);
    } catch (err) {
      console.error('Error setting current aeta:', err);
      alert('Failed to set current stage');
    }
  };

  // Reset form
  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({});
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-gray-900 text-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link
              href={`/profile/${profileId}`}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-blue-600 bg-clip-text text-transparent">
                Life Stages Editor
              </h1>
              <p className="text-gray-400 mt-2">Manage your theatrical career progression</p>
            </div>
          </div>
          <button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg transition-colors font-semibold"
          >
            <Plus size={20} />
            Add Stage
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-700 rounded-lg text-red-300">
            Error: {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Canonical Stages (Reference) */}
          <NeoCard variant="obsidian" className="lg:col-span-1">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <BookOpen size={20} className="text-cyan-400" />
              Canonical Stages
            </h2>
            <div className="space-y-3">
              {canonicalAetas.map((aeta, idx) => (
                <div key={aeta.id} className="p-3 bg-gray-800/50 rounded border border-gray-700">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-2xl">{AETA_EMOJIS[idx] || '📍'}</span>
                    <div>
                      <h3 className="font-semibold text-cyan-300">{aeta.name}</h3>
                      <p className="text-xs text-gray-400">{AETA_LABELS[idx]}</p>
                    </div>
                  </div>
                  {aeta.description && (
                    <p className="text-xs text-gray-400 ml-10">{aeta.description}</p>
                  )}
                </div>
              ))}
            </div>
          </NeoCard>

          {/* Profile Aetas (Editable) */}
          <div className="lg:col-span-2 space-y-4">
            {profileAetas.length === 0 ? (
              <NeoCard variant="cyber">
                <div className="text-center py-12">
                  <p className="text-gray-400 mb-4">No stages tracked yet.</p>
                  <p className="text-sm text-gray-500">
                    Create your first stage to begin documenting your theatrical progression.
                  </p>
                </div>
              </NeoCard>
            ) : (
              <>
                {/* Progress Summary */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                    <div className="text-3xl font-bold text-cyan-400">{profileAetas.length}</div>
                    <div className="text-xs text-gray-400">Stages Completed</div>
                  </div>
                  <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                    <div className="text-3xl font-bold text-blue-400">
                      {currentAetasId ? '1' : '0'}
                    </div>
                    <div className="text-xs text-gray-400">Current Stage</div>
                  </div>
                  <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                    <div className="text-3xl font-bold text-purple-400">
                      {Math.max(0, 8 - profileAetas.length)}
                    </div>
                    <div className="text-xs text-gray-400">Remaining</div>
                  </div>
                </div>

                {/* Stages List */}
                <div className="space-y-3">
                  {profileAetas.map((aeta) => {
                    const idx = getAetasIndex(aeta);
                    const isCurrent = aeta.id === currentAetasId;
                    return (
                      <NeoCard
                        key={aeta.id}
                        variant={isCurrent ? 'cyber' : 'obsidian'}
                        className={isCurrent ? 'border-2 border-cyan-400' : ''}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="text-3xl">{AETA_EMOJIS[idx] || '📍'}</span>
                              <div>
                                <h3 className="text-lg font-bold text-white">{aeta.name}</h3>
                                {isCurrent && (
                                  <span className="inline-block text-xs bg-cyan-600 text-white px-2 py-1 rounded mt-1">
                                    Current Stage
                                  </span>
                                )}
                              </div>
                            </div>

                            {aeta.description && (
                              <p className="text-sm text-gray-300 ml-12 mb-3">{aeta.description}</p>
                            )}

                            <div className="flex gap-4 text-xs text-gray-400 ml-12">
                              {aeta.typical_age_range &&
                                (aeta.typical_age_range.min || aeta.typical_age_range.max) && (
                                  <div className="flex items-center gap-1">
                                    <Calendar size={14} />
                                    Age: {aeta.typical_age_range.min || '?'}-
                                    {aeta.typical_age_range.max || '?'}
                                  </div>
                                )}
                              {aeta.duration_months && (
                                <div className="flex items-center gap-1">
                                  <Calendar size={14} />
                                  Duration: {aeta.duration_months} months
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex gap-2 ml-4">
                            {!isCurrent && (
                              <button
                                onClick={() => handleSetCurrent(aeta.id)}
                                className="p-2 hover:bg-gray-700 rounded transition-colors text-blue-400 hover:text-blue-300"
                                title="Set as current stage"
                              >
                                <span className="text-xs font-semibold">Mark Current</span>
                              </button>
                            )}
                            <button
                              onClick={() => handleEdit(aeta)}
                              className="p-2 hover:bg-gray-700 rounded transition-colors text-gray-400 hover:text-cyan-400"
                              title="Edit stage"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button
                              onClick={() => handleDelete(aeta.id)}
                              className="p-2 hover:bg-gray-700 rounded transition-colors text-gray-400 hover:text-red-400"
                              title="Delete stage"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>
                      </NeoCard>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Edit/Add Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <NeoCard variant="cyber" className="w-full max-w-2xl">
              <h2 className="text-2xl font-bold mb-6">
                {editingId ? 'Edit Stage' : 'Add New Stage'}
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Stage Name</label>
                  <input
                    type="text"
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                    placeholder="e.g., Senior Engineer, Tech Lead"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-500 h-24"
                    placeholder="What characterized this stage? Key achievements, learnings, or role changes?"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Min Age (Optional)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="120"
                      value={formData.typical_age_range?.min ?? ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          typical_age_range: {
                            ...(formData.typical_age_range || {}),
                            min: e.target.value ? parseInt(e.target.value) : undefined,
                          },
                        })
                      }
                      className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                      placeholder="e.g., 25"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Max Age (Optional)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="120"
                      value={formData.typical_age_range?.max ?? ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          typical_age_range: {
                            ...(formData.typical_age_range || {}),
                            max: e.target.value ? parseInt(e.target.value) : undefined,
                          },
                        })
                      }
                      className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                      placeholder="e.g., 45"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Duration (months, Optional)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.duration_months ?? ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          duration_months: e.target.value ? parseInt(e.target.value) : undefined,
                        })
                      }
                      className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                      placeholder="e.g., 60"
                    />
                  </div>
                </div>

                <div className="flex gap-4 justify-end pt-4 border-t border-gray-700">
                  <button
                    onClick={resetForm}
                    className="px-4 py-2 border border-gray-600 rounded hover:bg-gray-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmit}
                    className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded font-semibold transition-colors"
                  >
                    {editingId ? 'Update Stage' : 'Create Stage'}
                  </button>
                </div>
              </div>
            </NeoCard>
          </div>
        )}
      </div>
    </div>
  );
}
