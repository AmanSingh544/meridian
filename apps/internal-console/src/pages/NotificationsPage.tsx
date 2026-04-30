import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useGetNotificationsQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
} from '@3sc/api';
import { useDocumentTitle } from '@3sc/hooks';
import { Button, Card, EmptyState, Skeleton, Tabs, TabPanel, Badge } from '@3sc/ui';
import { formatRelativeTime } from '@3sc/utils';
import type { Notification, NotificationType } from '@3sc/types';

const typeIcons: Record<string, string> = {
  ticket_created: '🎫',
  ticket_updated: '✏️',
  ticket_assigned: '👤',
  ticket_status_changed: '🔄',
  ticket_comment: '💬',
  ticket_mention: '@',
  sla_at_risk: '⚠️',
  sla_breached: '🚨',
  project_update: '📁',
  system: '⚙️',
};

export const NotificationsPage: React.FC = () => {
  useDocumentTitle('Notifications');
  const navigate = useNavigate();
  const [tab, setTab] = useState('all');

  const { data, isLoading } = useGetNotificationsQuery({
    page: 1,
    unreadOnly: tab === 'unread' ? true : undefined,
  });
  const [markRead] = useMarkNotificationReadMutation();
  const [markAllRead] = useMarkAllNotificationsReadMutation();

  const handleClick = (n: Notification) => {
    if (!n.isRead) markRead(n.id);
    if (n.resourceType === 'ticket' && n.resourceId) {
      navigate(`/tickets/${n.resourceId}`);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, fontFamily: 'var(--font-display)' }}>
          Notifications
        </h1>
        <Button variant="ghost" size="sm" onClick={() => markAllRead()}>
          Mark all as read
        </Button>
      </div>

      <Tabs
        tabs={[
          { key: 'all', label: 'All' },
          { key: 'unread', label: 'Unread' },
        ]}
        activeTab={tab}
        onChange={setTab}
      />

      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} height="4rem" />)}
        </div>
      ) : data?.data.length === 0 ? (
        <EmptyState icon="🔔" title="No notifications" description="You're all caught up." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
          {data?.data.map((n) => (
            <div
              key={n.id}
              onClick={() => handleClick(n)}
              style={{
                display: 'flex', gap: '0.75rem', padding: '0.875rem 1rem',
                background: n.isRead ? 'var(--color-bg)' : 'var(--color-brand-50)',
                border: `1px solid ${n.isRead ? 'var(--color-border)' : 'var(--color-brand-200)'}`,
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                transition: 'var(--transition-fast)',
              }}
            >
              <span style={{ fontSize: '1.25rem', flexShrink: 0 }}>
                {typeIcons[n.type] || '📌'}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                  margin: 0, fontSize: '0.875rem',
                  fontWeight: n.isRead ? 400 : 600,
                }}>
                  {n.title}
                </p>
                <p style={{
                  margin: '0.125rem 0 0', fontSize: '0.8125rem',
                  color: 'var(--color-text-secondary)',
                }}>
                  {n.message}
                </p>
              </div>
              <span style={{
                fontSize: '0.75rem', color: 'var(--color-text-muted)',
                whiteSpace: 'nowrap', flexShrink: 0,
              }}>
                {formatRelativeTime(n.created_at)}
              </span>
              {!n.isRead && (
                <span style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: 'var(--color-brand-500)',
                  flexShrink: 0, marginTop: '0.375rem',
                }} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
