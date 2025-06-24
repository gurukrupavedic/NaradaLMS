/**
 * Theme Switcher Component - Modern Colorful Design System
 * Provides elegant light/dark mode switching with visual feedback
 */

import React from 'react';
import { useColorfulTheme } from '@/hooks/useColorfulTheme';
import { Sun, Moon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ThemeSwitcherProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showLabels?: boolean;
}

export function ThemeSwitcher({ 
  className, 
  size = 'md', 
  showLabels = false 
}: ThemeSwitcherProps) {
  const { theme, toggleTheme } = useColorfulTheme();
  
  const sizeClasses = {
    sm: 'h-6 w-11',
    md: 'h-7 w-12', 
    lg: 'h-8 w-14'
  };
  
  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };
  
  return (
    <div className={cn('flex items-center space-x-3', className)}>
      {showLabels && (
        <span className="text-sm font-medium text-muted-foreground">
          {theme === 'light' ? 'Light' : 'Dark'}
        </span>
      )}
      
      <button
        onClick={toggleTheme}
        className={cn(
          'relative inline-flex items-center rounded-full border-2 border-transparent',
          'transition-colors duration-200 ease-in-out focus:outline-none',
          'focus-visible:ring-2 focus-visible:ring-blue-modern focus-visible:ring-offset-2',
          sizeClasses[size],
          theme === 'light' 
            ? 'bg-gray-200 hover:bg-gray-300' 
            : 'bg-blue-modern hover:bg-blue-darker'
        )}
        role="switch"
        aria-checked={theme === 'dark'}
        aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      >
        <span
          className={cn(
            'pointer-events-none relative inline-block rounded-full shadow',
            'transform transition-transform duration-200 ease-in-out',
            'bg-white flex items-center justify-center',
            theme === 'light' ? 'translate-x-0' : `translate-x-5`,
            size === 'sm' ? 'h-5 w-5' : size === 'md' ? 'h-6 w-6' : 'h-7 w-7'
          )}
        >
          {theme === 'light' ? (
            <Sun className={cn(iconSizes[size], 'text-yellow-500')} />
          ) : (
            <Moon className={cn(iconSizes[size], 'text-blue-600')} />
          )}
        </span>
      </button>
      
      {showLabels && (
        <span className="text-sm font-medium text-foreground">
          {theme === 'dark' ? 'Dark' : 'Light'}
        </span>
      )}
    </div>
  );
}

/**
 * Compact Theme Toggle Button - Alternative implementation
 */
export function ThemeToggleButton({ className }: { className?: string }) {
  const { theme, toggleTheme } = useColorfulTheme();
  
  return (
    <button
      onClick={toggleTheme}
      className={cn(
        'p-2 rounded-lg border border-border hover:bg-muted',
        'transition-colors duration-200 focus:outline-none',
        'focus-visible:ring-2 focus-visible:ring-blue-modern focus-visible:ring-offset-2',
        className
      )}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      {theme === 'light' ? (
        <Moon className="w-5 h-5 text-muted-foreground hover:text-foreground" />
      ) : (
        <Sun className="w-5 h-5 text-yellow-500" />
      )}
    </button>
  );
}