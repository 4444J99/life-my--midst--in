import React, { useEffect, useCallback } from 'react';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  maxWidth?: string;
  children: React.ReactNode;
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(16, 14, 12, 0.8)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 40,
  backdropFilter: 'blur(6px)',
};

const cardBaseStyle: React.CSSProperties = {
  background: 'var(--ds-white, #fff)',
  borderRadius: 'var(--ds-radius-lg, 22px)',
  padding: '2rem',
  boxShadow: 'var(--ds-shadow, 0 24px 60px rgba(25, 20, 15, 0.18))',
  animation: 'fadeUp 0.3s ease both',
};

export const Modal: React.FC<ModalProps> = ({ open, onClose, maxWidth = '900px', children }) => {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (!open) return;
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, handleKeyDown]);

  if (!open) return null;

  return (
    <div
      style={overlayStyle}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div style={{ ...cardBaseStyle, maxWidth: `min(${maxWidth}, 90vw)` }}>{children}</div>
    </div>
  );
};
