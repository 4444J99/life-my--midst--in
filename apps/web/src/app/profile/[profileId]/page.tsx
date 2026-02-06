'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { AppHeader } from '@/components/AppHeader';
import { PersonaeSelector } from '@/components/PersonaeSelector';
import { CVEntryManager } from '@/components/CVEntryManager';
import { useProfileData } from '@/hooks/useProfileData';
import { usePersonae } from '@/hooks/usePersonae';
import { useAetas } from '@/hooks/useAetas';
import { useScaenae } from '@/hooks/useScaenae';
import { Calendar } from 'lucide-react';

/**
 * Profile CV Editor Page
 *
 * Main page for managing:
 * - Theatrical persona selection
 * - CV entry management with multi-dimensional tagging
 * - Aetas (life-stage) progression
 * - Scaenae (theatrical context) filtering
 */
export default function ProfilePage() {
  const params = useParams();
  const profileId = params['profileId'] as string | null;

  const { profile, cv, loading: profileLoading, error: profileError } = useProfileData(profileId);
  const {
    personas,
    selectedPersonaId,
    loading: personaeLoading,
    selectPersona,
    addPersona: _addPersona,
    updatePersona: _updatePersona,
    deletePersona: _deletePersona,
  } = usePersonae(profileId);
  const {
    canonicalAetas,
    profileAetas,
    currentAetasId,
    addProfileAetas: _addProfileAetas,
    setCurrentAetas,
  } = useAetas(profileId);
  const { scaenae: _scaenae, canonicalScaenae } = useScaenae();

  const selectedPersona = personas.find((p) => p.id === selectedPersonaId) || null;

  if (!profileId) {
    return (
      <main style={{ padding: '2rem' }}>
        <h1>Profile Not Found</h1>
        <p>Please provide a valid profile ID.</p>
      </main>
    );
  }

  if (profileLoading) {
    return (
      <main style={{ padding: '2rem' }}>
        <h1>Loading profile...</h1>
      </main>
    );
  }

  if (profileError) {
    return (
      <main style={{ padding: '2rem' }}>
        <h1>Error Loading Profile</h1>
        <p>{profileError}</p>
      </main>
    );
  }

  return (
    <>
      <AppHeader
        profileId={profileId}
        profileName={profile?.displayName}
        currentPersona={selectedPersona}
        allPersonas={personas}
        onSelectPersona={selectPersona}
        loading={personaeLoading}
      />

      <main
        style={{
          maxWidth: '1400px',
          margin: '0 auto',
          padding: '2rem',
        }}
      >
        <section style={{ marginBottom: '3rem' }}>
          <h1 style={{ marginTop: 0, marginBottom: '0.5rem' }}>Curriculum Vitae Editor</h1>
          <p
            style={{
              color: 'var(--stone)',
              marginBottom: '2rem',
            }}
          >
            Manage your master CV with theatrical masks and multi-dimensional tagging. Select a
            persona to view and edit context-specific resumes.
          </p>
        </section>

        {/* Two-column layout: Personas on left, CV on right */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 2fr',
            gap: '2rem',
          }}
        >
          {/* Left: Persona Selector */}
          <div>
            <PersonaeSelector
              personas={personas}
              selectedPersonaId={selectedPersonaId || undefined}
              onSelectPersona={selectPersona}
              loading={personaeLoading}
            />

            {/* Aetas Timeline (condensed) */}
            {canonicalAetas.length > 0 && (
              <div style={{ marginTop: '2rem' }}>
                <div className="section" style={{ padding: '1.2rem' }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '1rem',
                    }}
                  >
                    <div className="label">Life-Stage Progression</div>
                    <Link
                      href={`/profile/${profileId}/aetas`}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-cyan-600 hover:bg-cyan-500 text-white rounded transition-colors font-semibold"
                    >
                      <Calendar size={14} />
                      Manage
                    </Link>
                  </div>
                  <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                    {canonicalAetas.slice(0, 4).map((aetas) => {
                      const emoji: Record<number, string> = {
                        1: '🌱',
                        2: '🌿',
                        3: '🌳',
                        4: '🚀',
                        5: '👑',
                        6: '🔮',
                        7: '📖',
                        8: '🛡️',
                      };
                      const isProfileAetas = profileAetas.some((pa) => pa.order === aetas.order);
                      const isCurrent = currentAetasId === aetas.id;

                      return (
                        <button
                          key={aetas.id}
                          onClick={() => setCurrentAetas(aetas.id)}
                          style={{
                            width: '45px',
                            height: '45px',
                            borderRadius: '50%',
                            border: isCurrent
                              ? '2px solid var(--accent)'
                              : isProfileAetas
                                ? '2px solid #4CAF50'
                                : '1px solid rgba(29, 26, 22, 0.08)',
                            background: isCurrent
                              ? 'rgba(211, 107, 60, 0.1)'
                              : isProfileAetas
                                ? 'rgba(76, 175, 80, 0.1)'
                                : '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1.2rem',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                          }}
                          title={aetas.name}
                        >
                          {emoji[aetas.order] || '◯'}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right: CV Entry Manager */}
          <div>
            {selectedPersona ? (
              <CVEntryManager
                entries={cv?.entries || []}
                personas={personas}
                aetas={canonicalAetas}
                scaenae={canonicalScaenae}
                onAddEntry={(entry) => {
                  // In a real app, would call API
                  console.log('Add entry:', entry);
                }}
                onUpdateEntry={(id, patch) => {
                  // In a real app, would call API
                  console.log('Update entry:', id, patch);
                }}
                onDeleteEntry={(id) => {
                  // In a real app, would call API
                  console.log('Delete entry:', id);
                }}
              />
            ) : (
              <div
                style={{
                  background: 'rgba(29, 26, 22, 0.02)',
                  padding: '3rem',
                  borderRadius: '4px',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🎭</div>
                <h3 style={{ margin: '0 0 0.5rem 0' }}>Select a Persona</h3>
                <p style={{ color: 'var(--stone)', margin: 0 }}>
                  Choose a theatrical mask from the left to view and edit its associated CV entries.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Stats Section */}
        <section
          style={{
            marginTop: '3rem',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
          }}
        >
          <div className="stat-card">
            <div className="stat-label">Total CV Entries</div>
            <div className="stat-value">{cv?.total ?? 0}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Active Personas</div>
            <div className="stat-value">{personas.length}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Life-Stages Completed</div>
            <div className="stat-value">{profileAetas.length} / 8</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Theatrical Stages</div>
            <div className="stat-value">{canonicalScaenae.length}</div>
          </div>
        </section>
      </main>
    </>
  );
}
