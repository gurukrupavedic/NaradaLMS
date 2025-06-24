/**
 * Colorful Button Component - Modern Design System Implementation
 * Supports multiple variants and color schemes
 */

import React from 'react';
import { useColorfulTheme, ColorVariant } from '@/hooks/useColorfulTheme';
import { cn } from '@/lib/utils';

interface ColorfulButtonProps {
  children: React.ReactNode;
  variant: ColorVariant;
  type?: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
}

export function ColorfulButton({
  children,
  variant,
  type = 'primary',
  size = 'md',
  className,
  onClick,
  disabled = false
}: ColorfulButtonProps) {
  const { getColorClasses } = useColorfulTheme();
  
  const buttonClasses = getColorClasses(variant, 'button');
  
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  };
  
  const typeClasses = type === 'secondary' 
    ? `btn-secondary-${variant}` 
    : `btn-primary-${variant}`;
  
  return (
    <button
      className={cn(
        'btn-modern',
        typeClasses,
        sizeClasses[size],
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}