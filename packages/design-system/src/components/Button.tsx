import React from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const variantStyles: Record<ButtonVariant, React.CSSProperties> = {
  primary: {
    background: 'var(--ds-ink, #1d1a16)',
    color: '#fff',
    border: 'none',
  },
  secondary: {
    background: 'var(--ds-white, #fff)',
    color: 'var(--ds-ink, #1d1a16)',
    border: '1px solid var(--ds-border-medium, rgba(29, 26, 22, 0.15))',
  },
  ghost: {
    background: 'transparent',
    color: 'var(--ds-ink, #1d1a16)',
    border: '1px dashed var(--ds-border-strong, rgba(29, 26, 22, 0.25))',
  },
};

const baseStyle: React.CSSProperties = {
  padding: '0.6rem 1.1rem',
  borderRadius: 'var(--ds-radius-pill, 999px)',
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'inherit',
  fontSize: 'inherit',
  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  style,
  children,
  disabled,
  ...props
}) => {
  return (
    <button
      style={{
        ...baseStyle,
        ...variantStyles[variant],
        ...(disabled ? { opacity: 0.5, cursor: 'not-allowed' } : {}),
        ...style,
      }}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};
