import React from 'react';
import { Circle } from 'lucide-react';
import type { TicketStatus, TicketPriority, SLAState } from '@3sc/types';
import { getStatusLabel, getStatusColor, getPriorityLabel, getPriorityColor, getSLAStateLabel, getSLAStateColor } from '@3sc/utils';
import { Icon } from './Icon';

export interface BadgeProps {
  children: React.ReactNode;
  color?: string;
  bgColor?: string;
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  color = 'var(--color-text-secondary)',
  bgColor = 'var(--color-bg-muted)',
  size = 'sm',
}) => (
  <span style={{
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.25rem',
    padding: size === 'sm' ? '0.125rem 0.5rem' : '0.25rem 0.625rem',
    fontSize: size === 'sm' ? '0.6875rem' : '0.75rem',
    fontWeight: 600,
    fontFamily: 'var(--font-body)',
    color,
    background: bgColor,
    borderRadius: 'var(--radius-full)',
    whiteSpace: 'nowrap',
    lineHeight: 1.5,
    letterSpacing: '0.01em',
  }}>
    {children}
  </span>
);

export const StatusBadge: React.FC<{ status: TicketStatus }> = ({ status }) => {
  const color = getStatusColor(status);
  return (
    <Badge color={color} bgColor={`${color}18`}>
      <span style={{ display: 'inline-flex', verticalAlign: 'middle', marginRight: 2 }}>
        <Icon icon={Circle} size="xs" color={color} />
      </span>
      {getStatusLabel(status)}
    </Badge>
  );
};

export const PriorityBadge: React.FC<{ priority: TicketPriority }> = ({ priority }) => {
  const color = getPriorityColor(priority);
  return (
    <Badge color={color} bgColor={`${color}15`}>
      {getPriorityLabel(priority)}
    </Badge>
  );
};

export const SLABadge: React.FC<{ state: SLAState }> = ({ state }) => {
  const color = getSLAStateColor(state);
  return (
    <Badge color={color} bgColor={`${color}15`} size="md">
      {getSLAStateLabel(state)}
    </Badge>
  );
};
