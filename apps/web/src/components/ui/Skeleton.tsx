'use client';

import type { CSSProperties } from 'react';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string;
  style?: CSSProperties;
}

const baseStyle: CSSProperties = {
  background:
    'linear-gradient(90deg, rgba(29,26,22,0.06) 25%, rgba(29,26,22,0.12) 50%, rgba(29,26,22,0.06) 75%)',
  backgroundSize: '200% 100%',
  animation: 'skeleton-pulse 1.5s ease-in-out infinite',
  borderRadius: 'var(--radius-sm, 10px)',
};

export function Skeleton({ width = '100%', height = '1rem', borderRadius, style }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      style={{
        ...baseStyle,
        width,
        height,
        ...(borderRadius ? { borderRadius } : {}),
        ...style,
      }}
    />
  );
}

export function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} width={i === lines - 1 ? '60%' : '100%'} height="0.85rem" />
      ))}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div
      style={{
        padding: '1rem 1.2rem',
        borderRadius: 'var(--radius-md, 14px)',
        background: '#fff',
        border: '1px solid rgba(29, 26, 22, 0.08)',
        boxShadow: '0 12px 24px rgba(25, 20, 15, 0.08)',
      }}
    >
      <Skeleton width="40%" height="0.8rem" style={{ marginBottom: '0.5rem' }} />
      <Skeleton width="60%" height="1.5rem" />
    </div>
  );
}
