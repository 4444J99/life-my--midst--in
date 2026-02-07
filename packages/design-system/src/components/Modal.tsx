import React, { useEffect, useCallback, useRef } from 'react';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  maxWidth?: string;
  /** Optional title for aria-labelledby. If provided, renders an h2. */
  title?: string;
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

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  maxWidth = '900px',
  title,
  children,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      // Focus trap
      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
        if (focusable.length === 0) return;
        const first = focusable[0]!;
        const last = focusable[focusable.length - 1]!;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    },
    [onClose],
  );

  useEffect(() => {
    if (!open) return;
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    document.addEventListener('keydown', handleKeyDown);

    // Move focus into dialog
    requestAnimationFrame(() => {
      if (dialogRef.current) {
        const first = dialogRef.current.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
        if (first) first.focus();
        else dialogRef.current.focus();
      }
    });

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      // Restore focus
      previousFocusRef.current?.focus();
    };
  }, [open, handleKeyDown]);

  if (!open) return null;

  const titleId = title ? 'modal-title' : undefined;

  return (
    <div
      style={overlayStyle}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        style={{
          ...cardBaseStyle,
          maxWidth: `min(${maxWidth}, 90vw)`,
          outline: 'none',
        }}
      >
        {title && (
          <h2
            id={titleId}
            style={{
              margin: '0 0 1rem',
              fontSize: '1.2rem',
              fontWeight: 700,
              fontFamily: 'var(--ds-font-display, Georgia, serif)',
            }}
          >
            {title}
          </h2>
        )}
        {children}
      </div>
    </div>
  );
};
