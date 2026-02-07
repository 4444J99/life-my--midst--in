'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import type { NarrativeResponse } from '../../../ui/client-dashboard';
import ReactMarkdown from 'react-markdown';
import './themes.css';
import { StructuredData } from '@/components/StructuredData';
import type { Profile } from '@in-midst-my-life/schema';

const apiBase = process.env['NEXT_PUBLIC_API_BASE_URL'] || 'http://localhost:3001';

type NarrativeBlock = {
  title: string;
  body: string;
  tags?: string[];
};

type ThemeType =
  | 'cognitive'
  | 'expressive'
  | 'operational'
  | 'academic'
  | 'futurist'
  | 'florentine'
  | 'default';

export default function SharePage() {
  const params = useParams();
  const profileId = params?.['profileId'] as string;
  const maskId = params?.['maskId'] as string;

  const [blocks, setBlocks] = useState<NarrativeBlock[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profileId || !maskId) return;

    const fetchNarrative = async () => {
      try {
        const [narrativeRes, profileRes] = await Promise.all([
          fetch(
            `${apiBase}/profiles/${profileId}/narratives/approved?maskId=${encodeURIComponent(maskId)}`,
          ),
          fetch(`${apiBase}/profiles/${profileId}`),
        ]);

        if (!narrativeRes.ok) {
          if (narrativeRes.status === 404) {
            throw new Error('No approved narrative available yet.');
          }
          throw new Error('Failed to load presentation');
        }

        const json = (await narrativeRes.json()) as NarrativeResponse & {
          meta?: { mask?: { ontology?: string } };
        };
        setBlocks(json.data ?? []);

        if (profileRes.ok) {
          const profileJson = (await profileRes.json()) as Profile;
          setProfile(profileJson);
        }

        // Infer theme from mask ontology if available in meta, or map manually
        const ontologyMap: Record<string, ThemeType> = {
          analyst: 'academic',
          strategist: 'cognitive',
          observer: 'academic',
          speculator: 'futurist',
          synthesist: 'cognitive',
          narrator: 'florentine', // The storyteller
          artisan: 'florentine', // The maker
          architect: 'cognitive',
          interpreter: 'expressive',
          provoker: 'futurist',
          mediator: 'expressive',
          executor: 'operational',
          steward: 'academic',
          integrator: 'operational',
          custodian: 'operational',
          calibrator: 'operational',
        };

        const inferredTheme = ontologyMap[maskId] ?? 'default';

        // Dynamically set data-theme attribute on body or a wrapper
        document.documentElement.setAttribute('data-theme', inferredTheme);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    void fetchNarrative();

    // Cleanup theme on unmount
    return () => {
      document.documentElement.removeAttribute('data-theme');
    };
  }, [profileId, maskId]);

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          background: 'var(--paper)',
        }}
      >
        <div className="label">Assembling Presentation...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--accent-strong)' }}>Presentation Unavailable</h2>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <main className="page" style={{ maxWidth: '800px', margin: '0 auto' }}>
      {profile && <StructuredData profile={profile} />}
      <header style={{ marginBottom: '3rem', textAlign: 'center' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'var(--ink)',
            color: 'var(--paper)',
            padding: '0.3rem 0.8rem',
            borderRadius: '99px',
            fontSize: '0.75rem',
            fontWeight: 600,
            marginBottom: '1rem',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#10b981',
              boxShadow: '0 0 8px #10b981',
            }}
          />
          Verifiable Presentation
        </div>
        <h1 className="hero-title" style={{ textTransform: 'capitalize' }}>
          {maskId} Perspective
        </h1>
        <p className="hero-subtitle">
          A verifiable, context-specific selection of professional history.
        </p>
        <a
          href={`/share/${profileId}/visuals`}
          className="chip"
          style={{ display: 'inline-flex', marginTop: '1rem', textDecoration: 'none' }}
        >
          View Visual Architecture
        </a>
      </header>

      <div className="timeline">
        {blocks.map((block, idx) => (
          <article
            key={idx}
            className="timeline-item fade-up"
            style={{ animationDelay: `${idx * 0.1}s` }}
          >
            <div className="timeline-dot" />
            <div>
              <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.25rem' }}>{block.title}</h2>
              <div style={{ color: 'var(--ink)', opacity: 0.85, lineHeight: 1.6 }}>
                <ReactMarkdown>{block.body}</ReactMarkdown>
              </div>
              {block.tags && block.tags.length > 0 && (
                <div className="chip-row" style={{ marginTop: '1rem' }}>
                  {block.tags.map((tag) => (
                    <span
                      key={tag}
                      className="chip"
                      style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem' }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </article>
        ))}
      </div>

      <div style={{ textAlign: 'center', marginTop: '2rem' }}>
        <button
          onClick={() => {
            void navigator.clipboard.writeText(window.location.href).then(() => {
              const btn = document.getElementById('copy-share-btn');
              if (btn) {
                btn.textContent = 'Link Copied!';
                setTimeout(() => {
                  btn.textContent = 'Copy Share Link';
                }, 2000);
              }
            });
          }}
          id="copy-share-btn"
          style={{
            padding: '0.5rem 1.2rem',
            borderRadius: '8px',
            border: '2px solid var(--ink)',
            background: 'transparent',
            cursor: 'pointer',
            fontSize: '0.85rem',
            fontWeight: 500,
          }}
        >
          Copy Share Link
        </button>
      </div>

      <footer style={{ marginTop: '4rem', textAlign: 'center', opacity: 0.5, fontSize: '0.9rem' }}>
        <p>
          Generated by <strong>in-midst-my-life</strong> • Verifiable Identity System
        </p>
      </footer>
    </main>
  );
}
