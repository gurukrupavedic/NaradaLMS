/**
 * Shared LinkStatusIcon Component
 * 
 * Provides consistent status visualization across all components
 * for segment-to-audio mapping status indication.
 */

import React from 'react';
import { Zap } from 'lucide-react';

interface LinkStatusIconProps {
  status: 'mapped' | 'unmapped';
  size?: 'sm' | 'md';
  className?: string;
}

const sizeClasses = {
  sm: 'h-3 w-3',
  md: 'h-4 w-4'
};

export const LinkStatusIcon: React.FC<LinkStatusIconProps> = ({
  status,
  size = 'md',
  className = ''
}) => {
  return (
    <Zap
      className={`${status === 'mapped' ? 'text-green-600 fill-current' : 'text-gray-400 opacity-60'} ${sizeClasses[size]} ${className}`}
    />
  );
};