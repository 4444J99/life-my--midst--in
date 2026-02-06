import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.5rem 0.65rem',
  borderRadius: 'var(--ds-radius-sm, 10px)',
  border: '1px solid var(--ds-border-strong, rgba(29, 26, 22, 0.2))',
  background: 'var(--ds-white, #fff)',
  fontFamily: 'inherit',
  fontSize: 'inherit',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  fontSize: '0.8rem',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: 'var(--ds-stone, #8f8376)',
  display: 'block',
  marginBottom: '0.35rem',
};

export const Input: React.FC<InputProps> = ({ label, id, style, ...props }) => {
  const inputId = id ?? (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div>
      {label && (
        <label htmlFor={inputId} style={labelStyle}>
          {label}
        </label>
      )}
      <input id={inputId} style={{ ...inputStyle, ...style }} {...props} />
    </div>
  );
};
