/**
 * Modern Colorful Design System - Theme Hook
 * Provides runtime theme switching and color management
 */

import { useState, useEffect, createContext, useContext, ReactNode } from 'react';

export type ColorfulTheme = 'light' | 'dark';
export type ColorVariant = 'blue' | 'green' | 'purple' | 'orange' | 'pink' | 'indigo';

interface ColorfulThemeContextType {
  theme: ColorfulTheme;
  setTheme: (theme: ColorfulTheme) => void;
  toggleTheme: () => void;
  getColorClasses: (variant: ColorVariant, type: 'card' | 'button' | 'badge') => string;
  isLoaded: boolean;
}

const ColorfulThemeContext = createContext<ColorfulThemeContextType | undefined>(undefined);

export function ColorfulThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ColorfulTheme>('light');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('vedic-colorful-theme') as ColorfulTheme;
    if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark')) {
      setThemeState(savedTheme);
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('vedic-colorful-theme', theme);
    }
  }, [theme, isLoaded]);

  const setTheme = (newTheme: ColorfulTheme) => {
    setThemeState(newTheme);
  };

  const toggleTheme = () => {
    setThemeState(current => current === 'light' ? 'dark' : 'light');
  };

  const getColorClasses = (variant: ColorVariant, type: 'card' | 'button' | 'badge'): string => {
    const baseClasses = {
      card: 'card-modern',
      button: 'btn-modern',
      badge: 'badge-modern'
    };

    const variantClasses = {
      card: `feature-card-${variant}`,
      button: `btn-primary-${variant}`,
      badge: `badge-${variant}`
    };

    return `${baseClasses[type]} ${variantClasses[type]}`;
  };

  return (
    <ColorfulThemeContext.Provider value={{
      theme,
      setTheme,
      toggleTheme,
      getColorClasses,
      isLoaded
    }}>
      {children}
    </ColorfulThemeContext.Provider>
  );
}

export function useColorfulTheme() {
  const context = useContext(ColorfulThemeContext);
  if (context === undefined) {
    throw new Error('useColorfulTheme must be used within a ColorfulThemeProvider');
  }
  return context;
}

export function useColorClasses(variant: ColorVariant, type: 'card' | 'button' | 'badge') {
  const { getColorClasses } = useColorfulTheme();
  return getColorClasses(variant, type);
}

export function getFluorescentGlow(variant: ColorVariant, theme: ColorfulTheme = 'light') {
  const colorMap = {
    blue: { color: '59, 130, 246', fluorescent: '219, 234, 254' },
    green: { color: '16, 185, 129', fluorescent: '220, 252, 231' },
    purple: { color: '139, 92, 246', fluorescent: '237, 233, 254' },
    orange: { color: '245, 158, 11', fluorescent: '255, 237, 213' },
    pink: { color: '236, 72, 153', fluorescent: '252, 231, 243' },
    indigo: { color: '99, 102, 241', fluorescent: '224, 231, 255' }
  };

  const { color, fluorescent } = colorMap[variant];

  if (theme === 'light') {
    return {
      boxShadow: `
        0 8px 25px rgba(0, 0, 0, 0.08),
        0 0 0 1px rgba(${color}, 0.3),
        0 4px 20px rgba(${fluorescent}, 1),
        0 0 25px rgba(${fluorescent}, 0.6)
      `
    };
  } else {
    return {
      boxShadow: `
        0 8px 25px rgba(0, 0, 0, 0.2),
        0 0 0 1px rgba(${color}, 0.3),
        0 0 15px rgba(${fluorescent}, 0.3),
        0 0 40px rgba(${fluorescent}, 0.2),
        0 0 60px rgba(${fluorescent}, 0.1)
      `
    };
  }
}