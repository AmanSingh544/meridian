import React, { useState } from 'react';

export interface TabItem {
  key: string;
  label: string;
  badge?: number;
  disabled?: boolean;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (key: string) => void;
}

export const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, onChange }) => (
  <div style={{
    display: 'flex',
    gap: '0',
    borderBottom: '2px solid var(--color-border)',
    marginBottom: '1.5rem',
  }} role="tablist">
    {tabs.map((tab) => (
      <button
        key={tab.key}
        role="tab"
        aria-selected={activeTab === tab.key}
        disabled={tab.disabled}
        onClick={() => onChange(tab.key)}
        style={{
          padding: '0.75rem 1.25rem',
          background: 'none',
          border: 'none',
          borderBottom: `2px solid ${activeTab === tab.key ? 'var(--color-brand-600)' : 'transparent'}`,
          marginBottom: '-2px',
          color: activeTab === tab.key ? 'var(--color-brand-600)' : 'var(--color-text-secondary)',
          fontWeight: activeTab === tab.key ? 600 : 400,
          fontSize: '0.875rem',
          fontFamily: 'var(--font-body)',
          cursor: tab.disabled ? 'not-allowed' : 'pointer',
          opacity: tab.disabled ? 0.5 : 1,
          transition: 'var(--transition-fast)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}
      >
        {tab.label}
        {tab.badge !== undefined && tab.badge > 0 && (
          <span style={{
            background: 'var(--color-danger)',
            color: '#fff',
            fontSize: '0.6875rem',
            fontWeight: 700,
            padding: '0.0625rem 0.375rem',
            borderRadius: 'var(--radius-full)',
            minWidth: '1.25rem',
            textAlign: 'center',
          }}>
            {tab.badge}
          </span>
        )}
      </button>
    ))}
  </div>
);

export const TabPanel: React.FC<{
  active: boolean;
  children: React.ReactNode;
}> = ({ active, children }) => {
  if (!active) return null;
  return <div role="tabpanel">{children}</div>;
};
