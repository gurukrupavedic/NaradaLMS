/**
 * Breadcrumb Component - Vedic LMS Design System
 * 
 * Navigation breadcrumbs for hierarchical LMS content.
 * Perfect for Track → Chapter → Segment navigation.
 * 
 * @author Vedic LMS Design System
 * @since 2025-06-24
 */

import React from "react";
import { ChevronRight, Home } from "lucide-react";
import { Link } from "wouter";

export interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ReactNode;
  active?: boolean;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  separator?: React.ReactNode;
  variant?: "blue" | "green" | "purple" | "orange" | "pink" | "indigo" | "teal" | "cyan" | "yellow" | "lime" | "rose" | "emerald";
  size?: "sm" | "md" | "lg";
  showHome?: boolean;
  maxItems?: number;
  className?: string;
}

const sizeClasses = {
  sm: {
    text: "text-sm",
    separator: "h-3 w-3",
    icon: "h-3 w-3"
  },
  md: {
    text: "text-base",
    separator: "h-4 w-4", 
    icon: "h-4 w-4"
  },
  lg: {
    text: "text-lg",
    separator: "h-5 w-5",
    icon: "h-5 w-5"
  }
};

const variantClasses = {
  blue: {
    active: "text-blue-600",
    inactive: "text-gray-600 hover:text-blue-600",
    separator: "text-blue-400"
  },
  green: {
    active: "text-green-600",
    inactive: "text-gray-600 hover:text-green-600",
    separator: "text-green-400"
  },
  purple: {
    active: "text-purple-600",
    inactive: "text-gray-600 hover:text-purple-600",
    separator: "text-purple-400"
  },
  orange: {
    active: "text-orange-600",
    inactive: "text-gray-600 hover:text-orange-600",
    separator: "text-orange-400"
  },
  pink: {
    active: "text-pink-600",
    inactive: "text-gray-600 hover:text-pink-600",
    separator: "text-pink-400"
  },
  indigo: {
    active: "text-indigo-600",
    inactive: "text-gray-600 hover:text-indigo-600",
    separator: "text-indigo-400"
  },
  teal: {
    active: "text-teal-600",
    inactive: "text-gray-600 hover:text-teal-600",
    separator: "text-teal-400"
  },
  cyan: {
    active: "text-cyan-600",
    inactive: "text-gray-600 hover:text-cyan-600",
    separator: "text-cyan-400"
  },
  yellow: {
    active: "text-yellow-600",
    inactive: "text-gray-600 hover:text-yellow-600",
    separator: "text-yellow-400"
  },
  lime: {
    active: "text-lime-600",
    inactive: "text-gray-600 hover:text-lime-600",
    separator: "text-lime-400"
  },
  rose: {
    active: "text-rose-600",
    inactive: "text-gray-600 hover:text-rose-600",
    separator: "text-rose-400"
  },
  emerald: {
    active: "text-emerald-600",
    inactive: "text-gray-600 hover:text-emerald-600",
    separator: "text-emerald-400"
  }
};

export function Breadcrumb({
  items,
  separator,
  variant = "blue",
  size = "md",
  showHome = true,
  maxItems,
  className = ""
}: BreadcrumbProps) {
  const variantStyle = variantClasses[variant];
  const sizeStyle = sizeClasses[size];
  
  // Add home item if requested
  const allItems = showHome 
    ? [{ label: "Home", href: "/", icon: <Home className={sizeStyle.icon} /> }, ...items]
    : items;

  // Handle max items with ellipsis
  const displayItems = maxItems && allItems.length > maxItems
    ? [
        ...allItems.slice(0, 1),
        { label: "...", active: false },
        ...allItems.slice(-(maxItems - 2))
      ]
    : allItems;

  const defaultSeparator = separator || <ChevronRight className={sizeStyle.separator} />;

  return (
    <nav className={`flex items-center space-x-2 ${className}`} aria-label="Breadcrumb">
      <ol className="flex items-center space-x-2">
        {displayItems.map((item, index) => {
          const isLast = index === displayItems.length - 1;
          const isActive = item.active || isLast;
          const isEllipsis = item.label === "...";

          return (
            <li key={index} className="flex items-center space-x-2">
              {/* Item */}
              <div className="flex items-center space-x-2">
                {item.icon && (
                  <span className={isActive ? variantStyle.active : variantStyle.inactive}>
                    {item.icon}
                  </span>
                )}
                
                {item.href && !isActive && !isEllipsis ? (
                  <Link href={item.href} className={`
                    ${sizeStyle.text} font-medium transition-colors cursor-pointer
                    ${variantStyle.inactive}
                  `}>
                    {item.label}
                  </Link>
                ) : (
                  <span className={`
                    ${sizeStyle.text} font-medium
                    ${isActive ? variantStyle.active : 'text-gray-400'}
                    ${isEllipsis ? 'cursor-default' : ''}
                  `}>
                    {item.label}
                  </span>
                )}
              </div>

              {/* Separator */}
              {!isLast && (
                <span className={`${variantStyle.separator} flex-shrink-0`}>
                  {defaultSeparator}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

// Pre-built LMS breadcrumb configurations
export const LMSBreadcrumbs = {
  // Content management navigation
  trackManagement: (trackId: string, trackTitle: string) => [
    { label: "Content Management", href: "/content-management" },
    { label: "Tracks", href: "/content-management/tracks" },
    { label: trackTitle, href: `/content-management/tracks/${trackId}` }
  ],

  chapterManagement: (trackId: string, trackTitle: string, chapterId: string, chapterTitle: string) => [
    { label: "Content Management", href: "/content-management" },
    { label: "Tracks", href: "/content-management/tracks" },
    { label: trackTitle, href: `/content-management/tracks/${trackId}` },
    { label: chapterTitle, href: `/content-management/tracks/${trackId}/chapters/${chapterId}` }
  ],

  // Student navigation
  learningPath: (trackTitle: string, chapterTitle: string) => [
    { label: "My Learning", href: "/dashboard" },
    { label: trackTitle },
    { label: chapterTitle }
  ],

  // Admin navigation
  userManagement: [
    { label: "Administration", href: "/admin" },
    { label: "User Management", href: "/admin/users" }
  ],

  systemSettings: [
    { label: "Administration", href: "/admin" },
    { label: "System Settings", href: "/admin/settings" }
  ]
};

// Educational semantic variants for LMS contexts
export const BreadcrumbVariants = {
  // Navigation contexts
  contentManagement: "blue" as const,
  studentLearning: "green" as const,
  administration: "purple" as const,
  
  // Content types
  track: "emerald" as const,
  chapter: "teal" as const,
  segment: "cyan" as const,
  
  // User roles
  admin: "purple" as const,
  teacher: "emerald" as const,
  student: "blue" as const,
  
  // System areas
  dashboard: "indigo" as const,
  settings: "orange" as const,
  reports: "pink" as const
};