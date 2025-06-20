/**
 * Connected Circles Icon Component
 * Simple SVG icon representing connected or mapped state
 */

import React from 'react';

interface ConnectedCirclesIconProps {
  className?: string;
}

export const ConnectedCirclesIcon: React.FC<ConnectedCirclesIconProps> = ({ 
  className = "h-4 w-4" 
}) => {
  return (
    <svg
      className={className}
      viewBox="0 0 16 16"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="4" cy="4" r="2" />
      <circle cx="12" cy="12" r="2" />
      <line x1="6" y1="6" x2="10" y2="10" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
};