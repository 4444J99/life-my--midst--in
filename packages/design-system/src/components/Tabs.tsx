import React, { useRef, useCallback } from 'react';

export interface Tab {
  id: string;
  label: string;
}

export interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (id: string) => void;
  style?: React.CSSProperties;
}

const barStyle: React.CSSProperties = {
  display: 'flex',
  gap: '0.25rem',
  borderBottom: '1px solid var(--ds-border-medium, rgba(29, 26, 22, 0.15))',
};

const tabBaseStyle: React.CSSProperties = {
  padding: '0.5rem 1rem',
  background: 'none',
  border: 'none',
  borderBottom: '2px solid transparent',
  fontFamily: 'inherit',
  fontSize: '0.9rem',
  cursor: 'pointer',
  color: 'var(--ds-text-muted, rgba(29, 26, 22, 0.6))',
  transition: 'color 0.15s ease, border-color 0.15s ease',
  marginBottom: '-1px',
};

const tabActiveStyle: React.CSSProperties = {
  color: 'var(--ds-ink, #1d1a16)',
  borderBottomColor: 'var(--ds-ink, #1d1a16)',
  fontWeight: 600,
};

export const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, onTabChange, style }) => {
  const tablistRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const currentIndex = tabs.findIndex((t) => t.id === activeTab);
      let nextIndex = -1;

      if (e.key === 'ArrowRight') {
        nextIndex = (currentIndex + 1) % tabs.length;
      } else if (e.key === 'ArrowLeft') {
        nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
      } else if (e.key === 'Home') {
        nextIndex = 0;
      } else if (e.key === 'End') {
        nextIndex = tabs.length - 1;
      }

      if (nextIndex >= 0) {
        e.preventDefault();
        const nextTab = tabs[nextIndex]!;
        onTabChange(nextTab.id);
        // Move focus to the newly active tab
        const buttons = tablistRef.current?.querySelectorAll<HTMLElement>('[role="tab"]');
        buttons?.[nextIndex]?.focus();
      }
    },
    [tabs, activeTab, onTabChange],
  );

  return (
    <div
      ref={tablistRef}
      role="tablist"
      style={{ ...barStyle, ...style }}
      onKeyDown={handleKeyDown}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onTabChange(tab.id)}
            style={{
              ...tabBaseStyle,
              ...(isActive ? tabActiveStyle : {}),
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
};
