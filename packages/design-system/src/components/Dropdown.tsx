import React, { useState, useRef, useEffect, useCallback } from 'react';

export interface DropdownItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export interface DropdownProps {
  trigger: React.ReactNode;
  items: DropdownItem[];
  onSelect: (id: string) => void;
  style?: React.CSSProperties;
}

const menuStyle: React.CSSProperties = {
  position: 'absolute',
  top: '100%',
  left: 0,
  marginTop: 4,
  minWidth: 180,
  background: 'var(--ds-white, #fff)',
  border: '1px solid var(--ds-border-medium, rgba(29, 26, 22, 0.15))',
  borderRadius: 'var(--ds-radius-md, 8px)',
  boxShadow: '0 8px 24px rgba(25, 20, 15, 0.12)',
  zIndex: 30,
  padding: '0.25rem 0',
  listStyle: 'none',
};

const itemBase: React.CSSProperties = {
  padding: '0.45rem 0.75rem',
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  cursor: 'pointer',
  background: 'none',
  border: 'none',
  width: '100%',
  fontFamily: 'inherit',
  fontSize: '0.9rem',
  color: 'var(--ds-ink, #1d1a16)',
  textAlign: 'left',
  transition: 'background 0.1s ease',
};

const itemHighlight: React.CSSProperties = {
  background: 'var(--ds-bg-subtle, rgba(29, 26, 22, 0.04))',
};

const itemDisabled: React.CSSProperties = {
  opacity: 0.4,
  cursor: 'not-allowed',
};

export const Dropdown: React.FC<DropdownProps> = ({ trigger, items, onSelect, style }) => {
  const [open, setOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const enabledItems = items.filter((i) => !i.disabled);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // Focus first item when opened
  useEffect(() => {
    if (open && menuRef.current) {
      setFocusedIndex(0);
      const buttons = menuRef.current.querySelectorAll<HTMLElement>(
        '[role="menuitem"]:not([disabled])',
      );
      buttons[0]?.focus();
    }
  }, [open]);

  const handleTriggerKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setOpen(true);
    }
  }, []);

  const handleMenuKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIndex((prev) => {
          const next = (prev + 1) % enabledItems.length;
          const buttons = menuRef.current?.querySelectorAll<HTMLElement>(
            '[role="menuitem"]:not([disabled])',
          );
          buttons?.[next]?.focus();
          return next;
        });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIndex((prev) => {
          const next = (prev - 1 + enabledItems.length) % enabledItems.length;
          const buttons = menuRef.current?.querySelectorAll<HTMLElement>(
            '[role="menuitem"]:not([disabled])',
          );
          buttons?.[next]?.focus();
          return next;
        });
      }
    },
    [enabledItems.length],
  );

  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'inline-block', ...style }}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        onKeyDown={handleTriggerKeyDown}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
          font: 'inherit',
        }}
      >
        {trigger}
      </button>
      {open && (
        <div ref={menuRef} style={menuStyle} role="menu" onKeyDown={handleMenuKeyDown}>
          {items.map((item, index) => {
            const enabledIndex = enabledItems.indexOf(item);
            return (
              <button
                key={item.id}
                role="menuitem"
                disabled={item.disabled}
                tabIndex={-1}
                onMouseEnter={() => setFocusedIndex(enabledIndex >= 0 ? enabledIndex : index)}
                onClick={() => {
                  if (!item.disabled) {
                    onSelect(item.id);
                    setOpen(false);
                    triggerRef.current?.focus();
                  }
                }}
                style={{
                  ...itemBase,
                  ...(enabledIndex === focusedIndex && !item.disabled ? itemHighlight : {}),
                  ...(item.disabled ? itemDisabled : {}),
                }}
              >
                {item.icon && <span aria-hidden="true">{item.icon}</span>}
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
