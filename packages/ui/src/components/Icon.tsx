import React from 'react';
import type { LucideIcon } from 'lucide-react';

export type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const SIZE_MAP: Record<IconSize, number> = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 20,
  xl: 24,
};

const STROKE_MAP: Record<IconSize, number> = {
  xs: 2,
  sm: 1.5,
  md: 2,
  lg: 2,
  xl: 2.5,
};

export interface IconProps {
  icon: LucideIcon;
  size?: IconSize | number;
  color?: string;
  style?: React.CSSProperties;
  className?: string;
}

export const Icon: React.FC<IconProps> = ({
  icon: LucideComponent,
  size = 'md',
  color,
  style,
  className,
}) => {
  const numericSize = typeof size === 'number' ? size : SIZE_MAP[size];
  const strokeWidth = typeof size === 'number' ? 2 : STROKE_MAP[size];

  return (
    <LucideComponent
      size={numericSize}
      strokeWidth={strokeWidth}
      color={color}
      style={{ flexShrink: 0, ...style }}
      className={className}
    />
  );
};
