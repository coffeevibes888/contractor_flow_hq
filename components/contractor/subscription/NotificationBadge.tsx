'use client';

import { Badge } from '@/components/ui/badge';
import { Bell } from 'lucide-react';

interface NotificationBadgeProps {
  count: number;
  variant?: 'default' | 'warning' | 'critical';
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

export function NotificationBadge({
  count,
  variant = 'default',
  size = 'md',
  showIcon = false,
  className = '',
}: NotificationBadgeProps) {
  if (count === 0) {
    return null;
  }

  const variantStyles = {
    default: 'bg-blue-500 text-white',
    warning: 'bg-amber-500 text-white',
    critical: 'bg-red-500 text-white',
  };

  const sizeStyles = {
    sm: 'h-4 min-w-[16px] text-[10px] px-1',
    md: 'h-5 min-w-[20px] text-xs px-1.5',
    lg: 'h-6 min-w-[24px] text-sm px-2',
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-3.5 w-3.5',
    lg: 'h-4 w-4',
  };

  const displayCount = count > 99 ? '99+' : count.toString();

  return (
    <Badge
      className={`
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        rounded-full
        font-semibold
        flex items-center gap-1
        animate-in fade-in zoom-in
        ${className}
      `}
    >
      {showIcon && <Bell className={iconSizes[size]} />}
      {displayCount}
    </Badge>
  );
}

interface NotificationDotProps {
  variant?: 'default' | 'warning' | 'critical';
  size?: 'sm' | 'md' | 'lg';
  pulse?: boolean;
  className?: string;
}

export function NotificationDot({
  variant = 'default',
  size = 'md',
  pulse = true,
  className = '',
}: NotificationDotProps) {
  const variantStyles = {
    default: 'bg-blue-500',
    warning: 'bg-amber-500',
    critical: 'bg-red-500',
  };

  const sizeStyles = {
    sm: 'h-2 w-2',
    md: 'h-2.5 w-2.5',
    lg: 'h-3 w-3',
  };

  return (
    <span className="relative inline-flex">
      <span
        className={`
          ${variantStyles[variant]}
          ${sizeStyles[size]}
          rounded-full
          ${className}
        `}
      />
      {pulse && (
        <span
          className={`
            absolute inset-0
            ${variantStyles[variant]}
            ${sizeStyles[size]}
            rounded-full
            animate-ping
            opacity-75
          `}
        />
      )}
    </span>
  );
}
