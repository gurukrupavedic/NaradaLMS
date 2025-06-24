/**
 * Design System Component Library - Main Export
 * 
 * Centralized export for all design system components and tokens.
 * This creates a clean API for importing design system elements.
 * 
 * @author Vedic LMS Design System
 * @since 2025-06-24
 */

// Foundation tokens
export * from './foundation';

// Core components
export * from './Card';
export * from './Button';

// Showcase component
export { DesignSystemShowcase } from './DesignSystemShowcase';

// Type definitions
export type { CardProps } from './Card';
export type { ButtonProps } from './Button';