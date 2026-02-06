import React from 'react';

export type CardVariant = 'default' | 'stat' | 'section';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
}

const variantStyles: Record<CardVariant, React.CSSProperties> = {
  default: {
    padding: '1rem 1.2rem',
    borderRadius: 'var(--ds-radius-md, 14px)',
    background: 'var(--ds-white, #fff)',
    border: '1px solid var(--ds-border, rgba(29, 26, 22, 0.08))',
    boxShadow: 'var(--ds-shadow-sm, 0 12px 24px rgba(25, 20, 15, 0.08))',
  },
  stat: {
    padding: '1rem 1.2rem',
    borderRadius: 'var(--ds-radius-md, 14px)',
    background: 'var(--ds-white, #fff)',
    border: '1px solid var(--ds-border, rgba(29, 26, 22, 0.08))',
    boxShadow: 'var(--ds-shadow-sm, 0 12px 24px rgba(25, 20, 15, 0.08))',
  },
  section: {
    padding: '1.8rem',
    borderRadius: 'var(--ds-radius-lg, 22px)',
    background: 'rgba(255, 255, 255, 0.75)',
    border: '1px solid var(--ds-border, rgba(29, 26, 22, 0.08))',
    boxShadow: '0 20px 40px rgba(25, 20, 15, 0.08)',
    position: 'relative',
  },
};

export const Card: React.FC<CardProps> = ({ variant = 'default', style, children, ...props }) => {
  return (
    <div style={{ ...variantStyles[variant], ...style }} {...props}>
      {children}
    </div>
  );
};
