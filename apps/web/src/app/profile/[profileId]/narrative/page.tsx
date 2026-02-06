'use client';

import { useParams } from 'next/navigation';
import { useState } from 'react';
import { AppHeader } from '@/components/AppHeader';
import { TheatricalNarrativeEditor } from '@/components/TheatricalNarrativeEditor';
import { PersonaeSelector } from '@/components/PersonaeSelector';
import { useProfileData } from '@/hooks/useProfileData';
import { usePersonae } from '@/hooks/usePersonae';
import { useNarratives } from '@/hooks/useNarratives';

/**
 * Narrative Page
 *
 * Provides:
 * - Narrative generation for selected persona
 * - Editing with theatrical metadata
 * - Preamble and disclaimer customization
 * - Generation history
 */
export default function NarrativePage() {
  const params = useParams();
  const profileId = params['profileId'] as string | null;

  const { profile, loading: _profileLoading } = useProfileData(profileId);
  const {
    personas,
    selectedPersonaId,
    selectPersona,
    loading: personaeLoading,
  } = usePersonae(profileId);
  const {
    blocks,
    mask: _mask,
    theatricalPreamble,
    authenticDisclaimer,
    loading: narrativeLoading,
    generateForMask,
    updateBlock: _updateBlock,
    saveNarratives,
    clear,
  } = useNarratives(profileId ?? '');

  const [showSelector, setShowSelector] = useState(!selectedPersonaId);
  const selectedPersona = personas.find((p) => p.id === selectedPersonaId) || null;

  if (!profileId) {
    return (
      <main style={{ padding: '2rem' }}>
        <h1>Profile Not Found</h1>
      </main>
    );
  }

  const handleGenerateNarrative = async () => {
    if (selectedPersonaId) {
      await generateForMask(selectedPersonaId);
    }
  };

  const handleSaveNarrative = async (
    updatedBlocks: any[],
    preamble?: string,
    disclaimer?: string,
  ) => {
    await saveNarratives(updatedBlocks, preamble, disclaimer);
  };

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

      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem' }}>
        <section style={{ marginBottom: '2rem' }}>
          <h1 style={{ marginTop: 0, marginBottom: '0.5rem' }}>Narrative Generation & Editing</h1>
          <p style={{ color: 'var(--stone)' }}>
            Generate AI-powered narrative blocks for your selected persona, then enrich them with
            theatrical metadata.
          </p>
        </section>

        {/* Two-column layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
          {/* Left: Persona Selector */}
          <div>
            {showSelector && personas.length > 0 ? (
              <>
                <PersonaeSelector
                  personas={personas}
                  selectedPersonaId={selectedPersonaId || undefined}
                  onSelectPersona={(id) => {
                    selectPersona(id);
                    setShowSelector(false);
                  }}
                  loading={personaeLoading}
                />
                <button
                  className="button ghost"
                  onClick={() => setShowSelector(false)}
                  style={{ marginTop: '1rem', width: '100%' }}
                >
                  Hide Selector
                </button>
              </>
            ) : (
              <div
                style={{
                  background: 'rgba(211, 107, 60, 0.05)',
                  border: '1px solid rgba(211, 107, 60, 0.2)',
                  padding: '1.5rem',
                  borderRadius: '4px',
                }}
              >
                <div className="label" style={{ marginBottom: '1rem' }}>
                  Current Persona
                </div>
                {selectedPersona ? (
                  <>
                    <div style={{ marginBottom: '1rem' }}>
                      <div className="stat-value" style={{ fontSize: '1.2rem', margin: 0 }}>
                        {selectedPersona.everyday_name}
                      </div>
                      <div
                        style={{
                          fontSize: '0.85rem',
                          color: 'var(--stone)',
                          fontStyle: 'italic',
                          marginTop: '0.3rem',
                        }}
                      >
                        {selectedPersona.nomen}
                      </div>
                    </div>
                    {selectedPersona.role_vector && (
                      <p className="section-subtitle" style={{ margin: '0.75rem 0 0 0' }}>
                        {selectedPersona.role_vector}
                      </p>
                    )}
                    <button
                      className="button ghost"
                      onClick={() => setShowSelector(true)}
                      style={{ marginTop: '1rem', width: '100%' }}
                    >
                      Change Persona
                    </button>
                  </>
                ) : (
                  <>
                    <p className="section-subtitle" style={{ margin: 0 }}>
                      Select a persona to generate narrative blocks.
                    </p>
                    <button
                      className="button"
                      onClick={() => setShowSelector(true)}
                      style={{ marginTop: '1rem', width: '100%' }}
                    >
                      Select Persona
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Generation Controls */}
            {selectedPersona && (
              <div
                style={{
                  marginTop: '1.5rem',
                  background: 'rgba(76, 175, 80, 0.05)',
                  border: '1px solid rgba(76, 175, 80, 0.2)',
                  padding: '1.5rem',
                  borderRadius: '4px',
                }}
              >
                <div className="label" style={{ marginBottom: '1rem' }}>
                  Generate Narrative
                </div>
                <p className="section-subtitle" style={{ margin: '0 0 1rem 0' }}>
                  Create AI-generated narrative blocks optimized for this persona.
                </p>
                <button
                  className="button"
                  onClick={() => void handleGenerateNarrative()}
                  disabled={narrativeLoading || !selectedPersona}
                  style={{ width: '100%' }}
                >
                  {narrativeLoading ? 'Generating...' : 'Generate Narrative'}
                </button>
                {blocks.length > 0 && (
                  <>
                    <button
                      className="button ghost"
                      onClick={() => clear()}
                      style={{ marginTop: '0.75rem', width: '100%' }}
                    >
                      Clear Blocks
                    </button>
                    <div
                      style={{
                        marginTop: '0.75rem',
                        fontSize: '0.85rem',
                        color: 'var(--stone)',
                        textAlign: 'center',
                      }}
                    >
                      {blocks.length} blocks generated
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Right: Narrative Editor */}
          <div>
            {selectedPersona && blocks.length > 0 ? (
              <TheatricalNarrativeEditor
                persona={selectedPersona}
                blocks={blocks}
                theatricalPreamble={theatricalPreamble || undefined}
                authenticDisclaimer={authenticDisclaimer || undefined}
                onSave={handleSaveNarrative}
                onGenerate={() => void handleGenerateNarrative()}
                loading={narrativeLoading}
              />
            ) : (
              <div
                style={{
                  background: 'rgba(29, 26, 22, 0.02)',
                  padding: '3rem',
                  borderRadius: '4px',
                  textAlign: 'center',
                  minHeight: '400px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'column',
                }}
              >
                <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>✍️</div>
                <h3 style={{ margin: '0 0 0.5rem 0' }}>No Narrative Generated</h3>
                <p style={{ color: 'var(--stone)', margin: 0, maxWidth: '300px' }}>
                  {selectedPersona
                    ? 'Click "Generate Narrative" to create AI-powered narrative blocks for this persona.'
                    : 'Select a theatrical persona from the left to begin.'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Info Section */}
        <section
          style={{
            marginTop: '3rem',
            background: 'rgba(63, 81, 181, 0.05)',
            border: '1px solid rgba(63, 81, 181, 0.2)',
            padding: '2rem',
            borderRadius: '4px',
          }}
        >
          <h2 style={{ marginTop: 0 }}>How Theatrical Narratives Work</h2>
          <div style={{ columns: '2', gap: '2rem', columnGap: '2rem' }}>
            <div style={{ marginBottom: '1rem' }}>
              <h3 style={{ margin: '0 0 0.5rem 0' }}>Theatrical Preamble</h3>
              <p className="section-subtitle" style={{ margin: 0 }}>
                An explicit statement that frames which persona is being presented and why.
                Transparency about perspective makes the narrative honest.
              </p>
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <h3 style={{ margin: '0 0 0.5rem 0' }}>Authentic Disclaimer</h3>
              <p className="section-subtitle" style={{ margin: 0 }}>
                Transparency about what's emphasized and de-emphasized in this particular narrative
                view. Acknowledges the curation inherent in any presentation.
              </p>
            </div>
            <div>
              <h3 style={{ margin: '0 0 0.5rem 0' }}>Narrative Blocks</h3>
              <p className="section-subtitle" style={{ margin: 0 }}>
                Individual narrative units enriched with theatrical metadata including performance
                notes and authentic caveats about their presentation.
              </p>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
