import React from 'react';

export interface ChipProps extends React.HTMLAttributes<HTMLSpanElement> {
  active?: boolean;
}

const baseStyle: React.CSSProperties = {
  padding: '0.3rem 0.8rem',
  borderRadius: 'var(--ds-radius-pill, 999px)',
  border: '1px solid var(--ds-border-medium, rgba(29, 26, 22, 0.15))',
  background: 'var(--ds-white, #fff)',
  fontSize: '0.85rem',
  cursor: 'pointer',
  display: 'inline-block',
  transition: 'border-color 0.15s ease, background 0.15s ease',
};

const activeStyle: React.CSSProperties = {
  borderColor: 'var(--ds-accent, #d36b3c)',
  background: 'rgba(211, 107, 60, 0.16)',
};

export const Chip: React.FC<ChipProps> = ({ active = false, style, children, ...props }) => {
  return (
    <span style={{ ...baseStyle, ...(active ? activeStyle : {}), ...style }} {...props}>
      {children}
    </span>
  );
};
