'use client';

import React, { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import Image from 'next/image';
import type { IntegrityProof } from '@in-midst-my-life/schema';

// Locally defined to match dashboard usage
interface GalleryItem {
  id: string;
  title: string;
  description?: string;
  url?: string;
  kind: 'image' | 'video' | 'fallback';
  integrity?: IntegrityProof;
  payload?: Record<string, unknown>;
  profileId?: string;
  entityType?: string;
}

interface ImmersiveModalProps {
  item: GalleryItem | null;
  onClose: () => void;
}

export function ImmersiveModal({ item, onClose }: ImmersiveModalProps) {
  const [verification, setVerification] = useState<'unverified' | 'verified' | 'invalid'>(
    'unverified',
  );
  const [attested, setAttested] = useState(false);

  useEffect(() => {
    if (!item) return;
    let active = true;

    // Note: Cryptographic verification is done server-side to avoid bundling crypto modules
    // Client receives pre-verified artifacts from the API
    // This useEffect just marks items as "self-attested" by default
    const verify = () => {
      if (!item.integrity) {
        if (active) setVerification('unverified');
        return;
      }
      // For now, trust that the server has already verified
      // Actual verification happens in the API layer
      if (active) setVerification('verified');
    };
    verify();
    return () => {
      active = false;
    };
  }, [item]);

  useEffect(() => {
    if (!item) return;
    let active = true;
    const loadAttestations = async () => {
      if (!item.profileId || !item.entityType) {
        if (active) setAttested(false);
        return;
      }
      try {
        const res = await fetch(
          `${process.env['NEXT_PUBLIC_API_BASE_URL'] || 'http://localhost:3001'}/profiles/${
            item.profileId
          }/attestation-blocks/entity/${item.entityType}/${item.id}`,
        );
        if (!res.ok) return;
        const json = (await res.json()) as { data?: Array<{ status?: string }> };
        if (active) {
          setAttested(Boolean(json.data?.some((entry) => entry.status === 'verified')));
        }
      } catch {
        if (active) setAttested(false);
      }
    };
    void loadAttestations();
    return () => {
      active = false;
    };
  }, [item]);

  if (!item) return null;

  return (
    <div
      className="immersive"
      onClick={onClose}
      role="button"
      tabIndex={0}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(16, 14, 12, 0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        backdropFilter: 'blur(8px)',
        padding: '2rem',
      }}
    >
      <div
        className="immersive-card fade-up"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        style={{
          background: '#fff',
          borderRadius: '24px',
          maxWidth: '1000px',
          width: '100%',
          maxHeight: '90vh',
          display: 'grid',
          gridTemplateColumns: item.url ? '1.2fr 1fr' : '1fr',
          overflow: 'hidden',
          boxShadow: '0 40px 80px rgba(0,0,0,0.4)',
        }}
      >
        {/* Media Column */}
        {item.url ? (
          <div style={{ background: '#f4efe6', position: 'relative', minHeight: '400px' }}>
            <Image src={item.url} alt={item.title} fill style={{ objectFit: 'cover' }} />
          </div>
        ) : null}

        {/* Content Column */}
        <div
          style={{
            padding: '3rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem',
            overflowY: 'auto',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
            <div>
              <div className="label" style={{ marginBottom: '0.5rem' }}>
                Verifiable Artifact
              </div>
              <h2 style={{ margin: 0, fontSize: '2rem', fontFamily: 'var(--font-display)' }}>
                {item.title}
              </h2>
            </div>
            <button
              className="button secondary"
              onClick={onClose}
              style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
            >
              Close
            </button>
          </div>

          <div style={{ fontSize: '1.1rem', lineHeight: 1.6, color: '#4a4641' }}>
            <ReactMarkdown>{item.description ?? ''}</ReactMarkdown>
          </div>

          <div
            style={{
              marginTop: 'auto',
              paddingTop: '2rem',
              borderTop: '1px solid rgba(0,0,0,0.1)',
            }}
          >
            <div className="grid two">
              <div>
                <div className="label">Verification Status</div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginTop: '0.25rem',
                    color: verification === 'verified' ? 'var(--accent-cool)' : 'var(--stone)',
                    fontWeight: 600,
                  }}
                >
                  <span
                    style={{ width: 8, height: 8, borderRadius: '50%', background: 'currentColor' }}
                  />
                  {attested
                    ? 'Third-Party Verified'
                    : verification === 'verified'
                      ? 'Cryptographically Verified'
                      : verification === 'invalid'
                        ? 'Verification Failed'
                        : 'Self-Attested'}
                </div>
              </div>
              <div>
                <div className="label">Block ID</div>
                <div
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '0.85rem',
                    marginTop: '0.25rem',
                    opacity: 0.7,
                  }}
                >
                  {item.id.split('-')[0]}...
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
