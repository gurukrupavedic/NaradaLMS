/**
 * Shared LinkStatusIcon Component
 * 
 * Provides consistent status visualization across all components
 * for segment-to-audio mapping status indication.
 */

import React from 'react';
import { Link2Off } from 'lucide-react';
import { ConnectedCirclesIcon } from '@shared/components/icons';

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
  if (status === 'mapped') {
    return (
      <ConnectedCirclesIcon 
        className={`text-green-600 ${sizeClasses[size]} ${className}`} 
      />
    );
  }
  
  return (
    <Link2Off 
      className={`text-gray-400 opacity-60 ${sizeClasses[size]} ${className}`} 
    />
  );
};