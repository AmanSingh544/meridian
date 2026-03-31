import React from 'react';
import { getInitials } from '@3sc/utils';

export interface AvatarProps {
  name: string;
  src?: string;
  size?: number;
  style?: React.CSSProperties;
}

const colorPalette = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e',
  '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#06b6d4', '#3b82f6',
];

function hashColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colorPalette[Math.abs(hash) % colorPalette.length];
}

export const Avatar: React.FC<AvatarProps> = ({ name, src, size = 36, style }) => {
  const bg = hashColor(name);

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          objectFit: 'cover',
          ...style,
        }}
      />
    );
  }

  return (
    <div
      aria-label={name}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: bg,
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.38,
        fontWeight: 600,
        fontFamily: 'var(--font-display)',
        flexShrink: 0,
        ...style,
      }}
    >
      {getInitials(name)}
    </div>
  );
};
