'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { TabulaPersonarumEntry } from '@in-midst-my-life/schema';

interface AppHeaderProps {
  profileId: string | null;
  profileName?: string;
  currentPersona: TabulaPersonarumEntry | null;
  allPersonas: TabulaPersonarumEntry[];
  onSelectPersona: (personaId: string) => void;
  loading?: boolean;
}

/**
 * AppHeader Component
 *
 * Top navigation bar with:
 * - Profile/branding
 * - Current persona context (compact view)
 * - Navigation links to key sections
 * - Persona switcher dropdown
 */
export function AppHeader({
  profileId,
  profileName,
  currentPersona,
  allPersonas,
  onSelectPersona,
  loading = false,
}: AppHeaderProps) {
  const [showPersonaMenu, setShowPersonaMenu] = useState(false);

  return (
    <header
      style={{
        background: '#fff',
        borderBottom: '1px solid rgba(29, 26, 22, 0.08)',
        padding: '1rem',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}
    >
      <div
        style={{
          maxWidth: '1400px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '2rem',
        }}
      >
        {/* Branding */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <div
              style={{
                fontSize: '1.2rem',
                fontWeight: '700',
                color: 'var(--accent)',
              }}
            >
              𝒾𝓃–𝓂𝒾𝒹𝓈𝓉–𝓂𝓎–𝓁𝒾𝒻𝓮
            </div>
          </Link>
          {profileName && (
            <>
              <div style={{ color: 'var(--stone)', fontSize: '0.9rem' }}>•</div>
              <div style={{ fontSize: '0.95rem', color: 'var(--dark)' }}>{profileName}</div>
            </>
          )}
        </div>

        {/* Navigation Links */}
        <nav
          style={{
            display: 'flex',
            gap: '2rem',
            flex: 1,
            alignItems: 'center',
          }}
        >
          {profileId && (
            <>
              <Link
                href={`/profile/${profileId}`}
                style={{
                  textDecoration: 'none',
                  color: 'var(--dark)',
                  fontSize: '0.95rem',
                  borderBottom: '2px solid transparent',
                  paddingBottom: '0.25rem',
                  transition: 'border-color 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  (e.target as HTMLAnchorElement).style.borderColor = 'var(--accent)';
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLAnchorElement).style.borderColor = 'transparent';
                }}
              >
                Profile
              </Link>
              <Link
                href={`/profile/${profileId}/resumes`}
                style={{
                  textDecoration: 'none',
                  color: 'var(--dark)',
                  fontSize: '0.95rem',
                  borderBottom: '2px solid transparent',
                  paddingBottom: '0.25rem',
                  transition: 'border-color 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  (e.target as HTMLAnchorElement).style.borderColor = 'var(--accent)';
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLAnchorElement).style.borderColor = 'transparent';
                }}
              >
                Resumes
              </Link>
              <Link
                href={`/profile/${profileId}/narrative`}
                style={{
                  textDecoration: 'none',
                  color: 'var(--dark)',
                  fontSize: '0.95rem',
                  borderBottom: '2px solid transparent',
                  paddingBottom: '0.25rem',
                  transition: 'border-color 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  (e.target as HTMLAnchorElement).style.borderColor = 'var(--accent)';
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLAnchorElement).style.borderColor = 'transparent';
                }}
              >
                Narrative
              </Link>
              <Link
                href={`/profile/${profileId}/interview`}
                style={{
                  textDecoration: 'none',
                  color: 'var(--dark)',
                  fontSize: '0.95rem',
                  borderBottom: '2px solid transparent',
                  paddingBottom: '0.25rem',
                  transition: 'border-color 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  (e.target as HTMLAnchorElement).style.borderColor = 'var(--accent)';
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLAnchorElement).style.borderColor = 'transparent';
                }}
              >
                Interview
              </Link>
            </>
          )}
        </nav>

        {/* Persona Context */}
        <div style={{ position: 'relative' }}>
          {currentPersona ? (
            <button
              onClick={() => setShowPersonaMenu(!showPersonaMenu)}
              style={{
                background: 'rgba(211, 107, 60, 0.1)',
                border: '1px solid rgba(211, 107, 60, 0.3)',
                padding: '0.6rem 1rem',
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.9rem',
                fontWeight: '500',
                color: 'var(--accent)',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                (e.target as HTMLButtonElement).style.background = 'rgba(211, 107, 60, 0.15)';
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLButtonElement).style.background = 'rgba(211, 107, 60, 0.1)';
              }}
            >
              <span>🎭</span>
              <span>{currentPersona.everyday_name}</span>
              <span
                style={{
                  transform: showPersonaMenu ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s ease',
                }}
              >
                ▼
              </span>
            </button>
          ) : (
            <div style={{ color: 'var(--stone)', fontSize: '0.9rem' }}>
              {loading ? 'Loading personas...' : 'No persona selected'}
            </div>
          )}

          {/* Persona Dropdown Menu */}
          {showPersonaMenu && allPersonas.length > 0 && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                background: '#fff',
                border: '1px solid rgba(29, 26, 22, 0.12)',
                borderRadius: '4px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                minWidth: '280px',
                marginTop: '0.5rem',
                zIndex: 1000,
              }}
            >
              <div
                style={{
                  maxHeight: '400px',
                  overflowY: 'auto',
                }}
              >
                {allPersonas.map((persona) => {
                  const isSelected = currentPersona?.id === persona.id;
                  return (
                    <button
                      key={persona.id}
                      onClick={() => {
                        onSelectPersona(persona.id);
                        setShowPersonaMenu(false);
                      }}
                      style={{
                        width: '100%',
                        background: isSelected ? 'rgba(211, 107, 60, 0.1)' : 'transparent',
                        border: 'none',
                        padding: '0.75rem 1rem',
                        textAlign: 'left',
                        cursor: 'pointer',
                        borderBottom: '1px solid rgba(29, 26, 22, 0.04)',
                        transition: 'background 0.2s ease',
                        fontSize: '0.9rem',
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) {
                          (e.target as HTMLButtonElement).style.background =
                            'rgba(29, 26, 22, 0.04)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        (e.target as HTMLButtonElement).style.background = isSelected
                          ? 'rgba(211, 107, 60, 0.1)'
                          : 'transparent';
                      }}
                    >
                      <div
                        style={{
                          fontWeight: isSelected ? '600' : '400',
                          color: isSelected ? 'var(--accent)' : 'var(--dark)',
                          marginBottom: '0.2rem',
                        }}
                      >
                        {persona.everyday_name}
                      </div>
                      <div
                        style={{
                          fontSize: '0.75rem',
                          color: 'var(--stone)',
                          fontStyle: 'italic',
                        }}
                      >
                        {persona.nomen}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default AppHeader;
