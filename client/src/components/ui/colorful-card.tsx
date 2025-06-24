/**
 * Colorful Card Component - Modern Design System Implementation
 * Supports fluorescent glow effects and dynamic color variants
 */

import React from 'react';
import { useColorfulTheme, ColorVariant } from '@/hooks/useColorfulTheme';
import { cn } from '@/lib/utils';

interface ColorfulCardProps {
  children: React.ReactNode;
  variant: ColorVariant;
  className?: string;
  onClick?: () => void;
  hover?: boolean;
}

export function ColorfulCard({ 
  children, 
  variant, 
  className, 
  onClick, 
  hover = true 
}: ColorfulCardProps) {
  const { getColorClasses } = useColorfulTheme();
  
  const cardClasses = getColorClasses(variant, 'card');
  
  return (
    <div
      className={cn(
        cardClasses,
        'feature-card',
        hover && 'hover:transform hover:translate-y-[-2px]',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  variant: ColorVariant;
  onClick?: () => void;
  className?: string;
}

export function FeatureCard({
  icon,
  title,
  description,
  variant,
  onClick,
  className
}: FeatureCardProps) {
  return (
    <ColorfulCard variant={variant} onClick={onClick} className={className}>
      <div className="icon-container mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-semibold mb-2 text-foreground">{title}</h3>
      <p className="text-muted-foreground text-sm">{description}</p>
    </ColorfulCard>
  );
}