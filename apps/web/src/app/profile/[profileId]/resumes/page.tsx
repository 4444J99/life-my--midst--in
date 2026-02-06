'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AppHeader } from '@/components/AppHeader';
import { ResumeViewer } from '@/components/ResumeViewer';
import { useProfileData } from '@/hooks/useProfileData';
import { usePersonae } from '@/hooks/usePersonae';
import type { CVEntry, TabulaPersonarumEntry } from '@in-midst-my-life/schema';

interface ResumeData {
  persona: TabulaPersonarumEntry;
  entries: CVEntry[];
  theatricalPreamble: string;
  entryCount: number;
}

/**
 * Resumes Page
 *
 * Displays:
 * - All filtered resumes (one per active persona)
 * - Batch generation interface
 * - Resume export options
 * - Persona-specific framing
 */
export default function ResumesPage() {
  const params = useParams();
  const profileId = params['profileId'] as string | null;

  const { profile, loading: _profileLoading } = useProfileData(profileId);
  const {
    personas,
    selectedPersonaId,
    selectPersona,
    loading: personaeLoading,
  } = usePersonae(profileId);

  const [resumes, setResumes] = useState<ResumeData[]>([]);
  const [loadingResumes, setLoadingResumes] = useState(false);
  const [activeResumeIdx, setActiveResumeIdx] = useState(0);

  const selectedPersona = personas.find((p) => p.id === selectedPersonaId) || null;
  const apiBase = process.env['NEXT_PUBLIC_API_BASE_URL'] || 'http://localhost:3001';

  // Generate batch resumes
  const generateAllResumes = async () => {
    if (!profileId) return;
    setLoadingResumes(true);
    try {
      const res = await fetch(
        `${apiBase}/profiles/${profileId}/cv/generate-resume/batch?activeOnly=true`,
      );
      if (!res.ok) throw new Error('Failed to generate resumes');

      const data = await res.json();
      const resumeList = (data.resumes || []).map((resume: any) => ({
        persona: resume.persona,
        entries: resume.entries,
        theatricalPreamble: resume.theatrical_preamble,
        entryCount: resume.entry_count,
      }));
      setResumes(resumeList);
      if (resumeList.length > 0) {
        setActiveResumeIdx(0);
      }
    } catch (err) {
      console.error('Error generating resumes:', err);
    } finally {
      setLoadingResumes(false);
    }
  };

  useEffect(() => {
    void generateAllResumes();
  }, [profileId]);

  if (!profileId) {
    return (
      <main style={{ padding: '2rem' }}>
        <h1>Profile Not Found</h1>
      </main>
    );
  }

  const currentResume = resumes[activeResumeIdx] || null;

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
          <h1 style={{ marginTop: 0, marginBottom: '0.5rem' }}>Filtered Resumes</h1>
          <p style={{ color: 'var(--stone)' }}>
            View and export context-specific resumes filtered for each theatrical persona.
          </p>
        </section>

        {/* Personas Navigation */}
        {resumes.length > 0 && (
          <div
            style={{
              display: 'flex',
              gap: '0.5rem',
              marginBottom: '2rem',
              overflowX: 'auto',
              paddingBottom: '0.5rem',
            }}
          >
            {resumes.map((resume, idx) => (
              <button
                key={resume.persona.id}
                onClick={() => setActiveResumeIdx(idx)}
                style={{
                  padding: '0.75rem 1.25rem',
                  borderRadius: '4px',
                  border:
                    idx === activeResumeIdx
                      ? '2px solid var(--accent)'
                      : '1px solid rgba(29, 26, 22, 0.08)',
                  background: idx === activeResumeIdx ? 'rgba(211, 107, 60, 0.1)' : '#fff',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: idx === activeResumeIdx ? '600' : '400',
                  color: idx === activeResumeIdx ? 'var(--accent)' : 'var(--dark)',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s ease',
                }}
              >
                {resume.persona.everyday_name}
                <span style={{ marginLeft: '0.5rem', color: 'var(--stone)' }}>
                  {resume.entryCount}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Main Resume Viewer */}
        {currentResume ? (
          <ResumeViewer
            persona={currentResume.persona}
            entries={currentResume.entries}
            theatricalPreamble={currentResume.theatricalPreamble}
            loading={loadingResumes}
            onExport={(format) => {
              console.log(`Export as ${format}`);
              // TODO: Implement export functionality
            }}
            onGenerateForMask={(maskId) => {
              console.log(`Generate for mask: ${maskId}`);
            }}
            allPersonas={personas}
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
            {loadingResumes ? (
              <>
                <p>Generating resumes for all personas...</p>
              </>
            ) : (
              <>
                <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📄</div>
                <h3 style={{ margin: '0 0 0.5rem 0' }}>No Resumes Generated</h3>
                <p style={{ color: 'var(--stone)', margin: 0 }}>
                  Click the "Generate All Resumes" button to create filtered resumes for all active
                  personas.
                </p>
                <button
                  className="button"
                  onClick={() => void generateAllResumes()}
                  style={{ marginTop: '1rem' }}
                >
                  Generate All Resumes
                </button>
              </>
            )}
          </div>
        )}

        {/* Batch Operations */}
        {resumes.length > 0 && (
          <section
            style={{
              marginTop: '3rem',
              background: 'rgba(63, 81, 181, 0.05)',
              border: '1px solid rgba(63, 81, 181, 0.2)',
              padding: '2rem',
              borderRadius: '4px',
            }}
          >
            <h2 style={{ marginTop: 0 }}>Batch Operations</h2>
            <p style={{ color: 'var(--stone)' }}>
              Generate, download, or share all {resumes.length} resumes at once.
            </p>
            <div className="hero-actions">
              <button
                className="button"
                onClick={() => void generateAllResumes()}
                disabled={loadingResumes}
              >
                {loadingResumes ? 'Generating...' : 'Regenerate All'}
              </button>
              <button
                className="button secondary"
                onClick={() => {
                  console.log('Downloading all resumes as ZIP');
                  // TODO: Implement zip download
                }}
              >
                Download All (ZIP)
              </button>
              <button
                className="button ghost"
                onClick={() => {
                  console.log('Opening share dialog');
                  // TODO: Implement share dialog
                }}
              >
                Share
              </button>
            </div>
          </section>
        )}

        {/* Summary Stats */}
        <section
          style={{
            marginTop: '2rem',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
          }}
        >
          <div className="stat-card">
            <div className="stat-label">Total Resumes</div>
            <div className="stat-value">{resumes.length}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">
              {currentResume ? 'Entries in Current' : 'Average Entries'}
            </div>
            <div className="stat-value">
              {currentResume
                ? currentResume.entryCount
                : resumes.length > 0
                  ? Math.round(resumes.reduce((sum, r) => sum + r.entryCount, 0) / resumes.length)
                  : 0}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Last Generated</div>
            <div className="stat-value">
              {resumes.length > 0
                ? new Date().toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })
                : '—'}
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
