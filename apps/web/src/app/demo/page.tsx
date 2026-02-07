'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';

const apiBase = process.env['NEXT_PUBLIC_API_BASE_URL'] || 'http://localhost:3001';

interface DemoMask {
  id: string;
  nomen: string;
  motto: string;
  ontology: string;
  visibility_scope: string[];
  activation_rules: {
    contexts: string[];
    triggers: string[];
  };
  stylistic_parameters: {
    tone: string;
    mode: string;
    compression: number;
  };
}

interface DemoBlock {
  title: string;
  body: string;
  tags?: string[];
}

interface DemoProfile {
  displayName: string;
  title: string;
  headline: string;
  summaryMarkdown?: string;
  locationText?: string;
  skills?: Array<{ name: string; level: string; category: string }>;
  experiences?: Array<{
    roleTitle: string;
    organization: string;
    startDate: string;
    endDate?: string;
    description: string;
  }>;
  languages?: string[];
  interests?: string[];
}

interface DemoData {
  profile: DemoProfile;
  masks: DemoMask[];
  narrativeBlocks: DemoBlock[];
  activeMask: DemoMask;
}

export default function DemoPage() {
  const [data, setData] = useState<DemoData | null>(null);
  const [activeMask, setActiveMask] = useState<DemoMask | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadDemo = async () => {
      try {
        const res = await fetch(`${apiBase}/demo/profile`);
        if (!res.ok) throw new Error('Failed to load demo');
        const json = (await res.json()) as { ok: boolean; data: DemoData };
        setData(json.data);
        setActiveMask(json.data.activeMask);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };
    void loadDemo();
  }, []);

  if (loading) {
    return (
      <div
        style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}
      >
        <p style={{ fontFamily: 'var(--font-display), Georgia, serif', color: 'var(--stone)' }}>
          Loading demo...
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h2>Demo Unavailable</h2>
        <p>{error || 'Failed to load demo data'}</p>
        <Link href="/" style={{ color: 'var(--accent-strong)' }}>
          Back to Home
        </Link>
      </div>
    );
  }

  const { profile, masks, narrativeBlocks } = data;

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 'clamp(1rem, 3vw, 2.5rem)' }}>
      {/* Header */}
      <header style={{ marginBottom: '2rem' }}>
        <Link
          href="/"
          style={{
            fontSize: '0.85rem',
            color: 'var(--stone)',
            textDecoration: 'none',
            display: 'inline-block',
            marginBottom: '1rem',
          }}
        >
          &larr; Back to Home
        </Link>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'var(--accent-strong)',
            color: '#fff',
            padding: '0.3rem 0.8rem',
            borderRadius: '99px',
            fontSize: '0.7rem',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginBottom: '1rem',
            marginLeft: '1rem',
          }}
        >
          Interactive Demo
        </div>
        <h1
          style={{
            fontFamily: 'var(--font-display), Georgia, serif',
            fontSize: 'clamp(1.8rem, 3vw, 2.5rem)',
            marginBottom: '0.5rem',
          }}
        >
          {profile.displayName}
        </h1>
        <p style={{ color: 'var(--stone)', fontSize: '1.1rem', marginBottom: '0.25rem' }}>
          {profile.title}
        </p>
        <p style={{ color: 'var(--stone)', fontStyle: 'italic' }}>{profile.headline}</p>
      </header>

      {/* Mask Switcher */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2
          style={{
            fontFamily: 'var(--font-display), Georgia, serif',
            fontSize: '1.3rem',
            marginBottom: '0.75rem',
          }}
        >
          Identity Masks
        </h2>
        <p style={{ color: 'var(--stone)', marginBottom: '1rem', fontSize: '0.9rem' }}>
          Each mask reshapes how the same professional data is presented. Click to switch
          perspective.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {masks.map((mask) => (
            <button
              key={mask.id}
              onClick={() => setActiveMask(mask)}
              style={{
                padding: '0.6rem 1.2rem',
                borderRadius: '8px',
                border:
                  activeMask?.id === mask.id
                    ? '2px solid var(--accent-strong)'
                    : '2px solid var(--divider, #e0ddd8)',
                background:
                  activeMask?.id === mask.id ? 'var(--accent-soft, #fef3e8)' : 'var(--paper)',
                cursor: 'pointer',
                fontWeight: activeMask?.id === mask.id ? 600 : 400,
                fontSize: '0.9rem',
                transition: 'all 0.2s',
              }}
            >
              {mask.nomen}
            </button>
          ))}
        </div>
      </section>

      {/* Active Mask Detail */}
      {activeMask && (
        <section
          style={{
            background: 'var(--accent-soft, #fef3e8)',
            borderRadius: '12px',
            padding: '1.5rem',
            marginBottom: '2.5rem',
            border: '1px solid var(--divider, #e0ddd8)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: '0.75rem',
              marginBottom: '0.5rem',
            }}
          >
            <h3 style={{ margin: 0, fontSize: '1.15rem' }}>{activeMask.nomen}</h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--stone)' }}>
              Tone: {activeMask.stylistic_parameters.tone} | Mode:{' '}
              {activeMask.stylistic_parameters.mode}
            </span>
          </div>
          <p
            style={{
              fontStyle: 'italic',
              color: 'var(--stone)',
              margin: '0 0 0.75rem',
              fontSize: '0.95rem',
            }}
          >
            &ldquo;{activeMask.motto}&rdquo;
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {activeMask.visibility_scope.map((scope) => (
              <span
                key={scope}
                style={{
                  background: 'var(--paper)',
                  border: '1px solid var(--divider, #e0ddd8)',
                  padding: '0.2rem 0.6rem',
                  borderRadius: '99px',
                  fontSize: '0.75rem',
                }}
              >
                {scope}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Narrative Blocks */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2
          style={{
            fontFamily: 'var(--font-display), Georgia, serif',
            fontSize: '1.3rem',
            marginBottom: '1rem',
          }}
        >
          Generated Narrative
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {narrativeBlocks.map((block, idx) => (
            <article
              key={idx}
              style={{
                padding: '1.25rem',
                borderRadius: '8px',
                border: '1px solid var(--divider, #e0ddd8)',
                background: 'var(--paper)',
              }}
            >
              <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.1rem' }}>{block.title}</h3>
              <div style={{ color: 'var(--ink)', opacity: 0.85, lineHeight: 1.7 }}>
                <ReactMarkdown>{block.body}</ReactMarkdown>
              </div>
              {block.tags && block.tags.length > 0 && (
                <div
                  style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.75rem' }}
                >
                  {block.tags.map((tag) => (
                    <span
                      key={tag}
                      style={{
                        background: 'var(--accent-soft, #fef3e8)',
                        padding: '0.15rem 0.5rem',
                        borderRadius: '99px',
                        fontSize: '0.7rem',
                        fontWeight: 500,
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      </section>

      {/* Skills */}
      {profile.skills && profile.skills.length > 0 && (
        <section style={{ marginBottom: '2.5rem' }}>
          <h2
            style={{
              fontFamily: 'var(--font-display), Georgia, serif',
              fontSize: '1.3rem',
              marginBottom: '0.75rem',
            }}
          >
            Skills
          </h2>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {profile.skills.map((skill) => (
              <span
                key={skill.name}
                style={{
                  padding: '0.4rem 0.8rem',
                  borderRadius: '8px',
                  border: '1px solid var(--divider, #e0ddd8)',
                  fontSize: '0.85rem',
                  background:
                    skill.level === 'expert' ? 'var(--accent-soft, #fef3e8)' : 'var(--paper)',
                  fontWeight: skill.level === 'expert' ? 600 : 400,
                }}
              >
                {skill.name}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Timeline */}
      {profile.experiences && profile.experiences.length > 0 && (
        <section style={{ marginBottom: '2.5rem' }}>
          <h2
            style={{
              fontFamily: 'var(--font-display), Georgia, serif',
              fontSize: '1.3rem',
              marginBottom: '1rem',
            }}
          >
            Experience Timeline
          </h2>
          <div style={{ borderLeft: '2px solid var(--divider, #e0ddd8)', paddingLeft: '1.5rem' }}>
            {profile.experiences.map((exp, idx) => (
              <div key={idx} style={{ marginBottom: '1.5rem', position: 'relative' }}>
                <div
                  style={{
                    position: 'absolute',
                    left: '-1.75rem',
                    top: '0.35rem',
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    background: idx === 0 ? 'var(--accent-strong)' : 'var(--divider, #e0ddd8)',
                    border: '2px solid var(--paper)',
                  }}
                />
                <p style={{ fontWeight: 600, margin: '0 0 0.25rem' }}>{exp.roleTitle}</p>
                <p style={{ color: 'var(--stone)', fontSize: '0.9rem', margin: '0 0 0.25rem' }}>
                  {exp.organization} &middot; {exp.startDate}
                  {exp.endDate ? ` – ${exp.endDate}` : ' – Present'}
                </p>
                <p style={{ fontSize: '0.9rem', lineHeight: 1.5 }}>{exp.description}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* CTA */}
      <section
        style={{
          textAlign: 'center',
          padding: '3rem 1rem',
          marginTop: '2rem',
          borderTop: '1px solid var(--divider, #e0ddd8)',
        }}
      >
        <h2
          style={{
            fontFamily: 'var(--font-display), Georgia, serif',
            fontSize: 'clamp(1.4rem, 2.5vw, 1.8rem)',
            marginBottom: '0.75rem',
          }}
        >
          Build Your Own
        </h2>
        <p style={{ color: 'var(--stone)', marginBottom: '1.5rem' }}>
          Create a composable, verifiable identity that adapts to every context.
        </p>
        <Link
          href="/dashboard"
          className="button"
          style={{ fontSize: '1rem', padding: '0.7rem 1.8rem' }}
        >
          Get Started
        </Link>
      </section>
    </div>
  );
}
