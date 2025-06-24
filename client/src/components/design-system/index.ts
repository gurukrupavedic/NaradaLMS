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
export * from './Input';
export * from './Tabs';
export * from './Progress';
export * from './Badge';
export * from './Alert';
export * from './Select';
export * from './Avatar';
export * from './TextSegment';

// Specialized components
export * from './Textarea';
export * from './Switch';
export * from './Tooltip';
export * from './Loading';
export * from './RichTextEditor';

// Showcase component
export { DesignSystemShowcase } from './DesignSystemShowcase';

// Type definitions
export type { CardProps } from './Card';
export type { ButtonProps } from './Button';
export type { InputProps } from './Input';
export type { TabsListProps, TabsTriggerProps } from './Tabs';
export type { ProgressProps, CircularProgressProps } from './Progress';
export type { BadgeProps } from './Badge';
export type { AlertProps } from './Alert';
export type { SelectTriggerProps } from './Select';
export type { AvatarProps } from './Avatar';
export type { TextSegmentProps } from './TextSegment';
export type { TextareaProps } from './Textarea';
export type { SwitchProps } from './Switch';
export type { TooltipContentProps } from './Tooltip';
export type { SpinnerProps, SkeletonProps } from './Loading';
export type { RichTextEditorProps } from './RichTextEditor';