import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useGetNotificationsQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
} from '@3sc/api';
import { useDocumentTitle } from '@3sc/hooks';
import { Button, Card, EmptyState, Skeleton, Tabs, TabPanel, Badge, Icon } from '@3sc/ui';
import { Bell, Ticket, Pencil, User, RefreshCw, MessageSquare, AtSign, AlertTriangle, AlertOctagon, FolderOpen, Settings, Pin } from 'lucide-react';
import { formatRelativeTime } from '@3sc/utils';
import type { Notification, NotificationType } from '@3sc/types';

const NotificationIcon: React.FC<{ type: string }> = ({ type }) => {
  const map: Record<string, typeof Ticket> = {
    ticket_created: Ticket,
    ticket_updated: Pencil,
    ticket_assigned: User,
    ticket_status_changed: RefreshCw,
    ticket_comment: MessageSquare,
    ticket_mention: AtSign,
    sla_at_risk: AlertTriangle,
    sla_breached: AlertOctagon,
    project_update: FolderOpen,
    system: Settings,
  };
  const Comp = map[type] || Pin;
  return <span style={{ display: 'inline-flex', verticalAlign: 'middle' }}><Icon icon={Comp} size="md" /></span>;
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
        <EmptyState icon={<Icon icon={Bell} size="xl" />} title="No notifications" description="You're all caught up." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
          {data?.data.map((n) => (
            <Card
              hover
              key={n.id}
              onClick={() => handleClick(n)}
              style={{
                background: n.isRead ? 'var(--color-bg)' : 'var(--color-brand-50)',
                borderColor: n.isRead ? 'var(--color-border)' : 'var(--color-brand-200)',
                cursor: 'pointer',
              }}
            >
              <span style={{ fontSize: '1.25rem', flexShrink: 0 }}>
                <NotificationIcon type={n.type} />
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
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
