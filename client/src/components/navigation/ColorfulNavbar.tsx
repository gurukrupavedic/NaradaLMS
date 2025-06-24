/**
 * Colorful Navbar Component - Modern Design System Implementation
 * Professional navigation with theme switching and colorful accents
 */

import React from 'react';
import { Link, useLocation } from 'wouter';
import { ThemeToggleButton } from './ThemeSwitcher';
import { useColorfulTheme } from '@/hooks/useColorfulTheme';
import { Home, Book, Users, Settings, Palette } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  variant?: 'blue' | 'green' | 'purple' | 'orange' | 'pink' | 'indigo';
}

const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/',
    icon: <Home className="w-4 h-4" />,
    variant: 'blue'
  },
  {
    label: 'Content',
    href: '/manage',
    icon: <Book className="w-4 h-4" />,
    variant: 'green'
  },
  {
    label: 'Users',
    href: '/users',
    icon: <Users className="w-4 h-4" />,
    variant: 'purple'
  },
  {
    label: 'Settings',
    href: '/settings',
    icon: <Settings className="w-4 h-4" />,
    variant: 'orange'
  },
  {
    label: 'Design System',
    href: '/experiments/colorful-demo',
    icon: <Palette className="w-4 h-4" />,
    variant: 'pink'
  }
];

export function ColorfulNavbar() {
  const [location] = useLocation();
  const { theme } = useColorfulTheme();
  
  return (
    <nav className="navbar-modern sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo/Brand */}
          <div className="flex items-center">
            <Link href="/">
              <div className="flex items-center space-x-3 cursor-pointer">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-modern to-purple-modern rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">VL</span>
                </div>
                <span className="text-xl font-bold text-foreground">Vedic LMS</span>
              </div>
            </Link>
          </div>
          
          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              const isActive = location === item.href || 
                (item.href !== '/' && location.startsWith(item.href));
              
              return (
                <Link key={item.href} href={item.href}>
                  <div
                    className={cn(
                      'px-4 py-2 rounded-lg flex items-center space-x-2',
                      'transition-all duration-200 cursor-pointer',
                      'hover:bg-muted hover:text-foreground',
                      isActive 
                        ? 'bg-blue-modern/10 text-blue-modern border-b-2 border-blue-modern' 
                        : 'text-muted-foreground'
                    )}
                  >
                    {item.icon}
                    <span className="text-sm font-medium">{item.label}</span>
                  </div>
                </Link>
              );
            })}
          </div>
          
          {/* Theme Toggle */}
          <div className="flex items-center space-x-4">
            <ThemeToggleButton />
          </div>
        </div>
      </div>
      
      {/* Mobile Menu (simplified for demo) */}
      <div className="md:hidden border-t border-border">
        <div className="px-4 py-2 space-y-1">
          {navItems.slice(0, 3).map((item) => {
            const isActive = location === item.href;
            
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={cn(
                    'px-3 py-2 rounded-md flex items-center space-x-3',
                    'transition-colors duration-200 cursor-pointer',
                    isActive 
                      ? 'bg-blue-modern/10 text-blue-modern' 
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  {item.icon}
                  <span className="text-sm font-medium">{item.label}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}