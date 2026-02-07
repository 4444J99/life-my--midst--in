import type { Metadata } from 'next';
import { Hero } from '@/components/marketing/Hero';
import { FeatureGrid } from '@/components/marketing/FeatureGrid';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'in midst my life — Verified, Composable Identity',
  description:
    'Transform your static résumé into a dynamic, queryable, multi-perspective profile with mask-based identity filtering and blockchain-inspired verification.',
  openGraph: {
    title: 'in midst my life',
    description:
      'Your identity, verified & composable. Mask-based identity filtering and DID/VC verification for the autonomous professional.',
    type: 'website',
  },
};

export default function LandingPage() {
  return (
    <>
      <Hero />
      <FeatureGrid />

      {/* Social proof placeholder */}
      <section
        style={{
          maxWidth: 1100,
          margin: '0 auto',
          padding: '2rem clamp(1rem, 3vw, 2.5rem)',
          textAlign: 'center',
        }}
      >
        <div className="section fade-up">
          <p
            style={{
              fontFamily: 'var(--font-display), Georgia, serif',
              fontSize: '1.3rem',
              fontStyle: 'italic',
              color: 'var(--stone)',
              margin: '0 auto',
              maxWidth: 600,
              lineHeight: 1.6,
            }}
          >
            &ldquo;Your professional identity is not a static document. It is a living system — one
            that should adapt to every context, audience, and opportunity.&rdquo;
          </p>
        </div>
      </section>

      {/* CTA */}
      <section
        className="fade-up"
        style={{
          maxWidth: 1100,
          margin: '0 auto',
          padding: '2rem clamp(1rem, 3vw, 2.5rem) 5rem',
          textAlign: 'center',
        }}
      >
        <h2
          style={{
            fontFamily: 'var(--font-display), Georgia, serif',
            fontSize: 'clamp(1.6rem, 2.5vw, 2.2rem)',
            marginBottom: '1rem',
          }}
        >
          Ready to take control?
        </h2>
        <p style={{ color: 'var(--stone)', marginBottom: '2rem' }}>
          Start building your composable identity today.
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link
            href="/demo"
            className="button"
            style={{
              fontSize: '1.05rem',
              padding: '0.8rem 2rem',
              background: 'transparent',
              color: 'var(--ink)',
              border: '2px solid var(--ink)',
            }}
          >
            Try Demo
          </Link>
          <Link
            href="/dashboard"
            className="button"
            style={{ fontSize: '1.05rem', padding: '0.8rem 2rem' }}
          >
            Get Started
          </Link>
        </div>
      </section>
    </>
  );
}
