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

// Foundation components (Group 1)
export * from './Card';
export * from './Button';
export * from './Input';
export * from './Badge';
export * from './Avatar';

// Data Display components (Group 2)  
export * from './Progress';
export * from './Alert';
export * from './Loading';
export * from './Tooltip';

// Navigation components (Group 3)
export * from './Tabs';
export * from './Select';
export * from './Switch';

// Content components (Group 4)
export * from './Textarea';
export * from './RichTextEditor';
export * from './TextSegment';

// Showcase component
export { DesignSystemShowcase } from './DesignSystemShowcase';

// Type definitions - organized by component groups
export type { CardProps } from './Card';
export type { ButtonProps } from './Button';
export type { InputProps } from './Input';
export type { BadgeProps } from './Badge';
export type { AvatarProps } from './Avatar';

export type { ProgressProps, CircularProgressProps } from './Progress';
export type { AlertProps } from './Alert';
export type { SpinnerProps, SkeletonProps } from './Loading';
export type { TooltipContentProps } from './Tooltip';

export type { TabsListProps, TabsTriggerProps } from './Tabs';
export type { SelectTriggerProps } from './Select';
export type { SwitchProps } from './Switch';

export type { TextareaProps } from './Textarea';
export type { RichTextEditorProps } from './RichTextEditor';
export type { TextSegmentProps } from './TextSegment';