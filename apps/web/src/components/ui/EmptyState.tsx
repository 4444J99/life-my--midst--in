import type { ReactNode, CSSProperties } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

const containerStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '3rem 2rem',
  textAlign: 'center',
  gap: '0.75rem',
};

const iconStyle: CSSProperties = {
  fontSize: '2.5rem',
  opacity: 0.4,
  marginBottom: '0.5rem',
};

const titleStyle: CSSProperties = {
  fontFamily: 'var(--font-display, Georgia, serif)',
  fontSize: '1.2rem',
  fontWeight: 600,
  color: 'var(--ink, #1d1a16)',
  margin: 0,
};

const descriptionStyle: CSSProperties = {
  fontSize: '0.95rem',
  color: 'var(--stone, #8f8376)',
  margin: 0,
  maxWidth: '400px',
};

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div style={containerStyle}>
      {icon && <div style={iconStyle}>{icon}</div>}
      <h3 style={titleStyle}>{title}</h3>
      {description && <p style={descriptionStyle}>{description}</p>}
      {action && <div style={{ marginTop: '0.75rem' }}>{action}</div>}
    </div>
  );
}
