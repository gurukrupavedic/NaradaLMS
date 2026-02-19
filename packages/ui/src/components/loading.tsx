import React from 'react';
import { cn } from '../lib/utils';
import { Loader2, X } from 'lucide-react';
import { Button } from './button';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LoadingSpinner({ size = 'md', className }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  };

  return (
    <Loader2
      className={cn('animate-spin', sizeClasses[size], className)}
    />
  );
}

interface LoadingSkeletonProps {
  width?: string;
  height?: string;
  className?: string;
  lines?: number;
}

export function LoadingSkeleton({
  width = 'w-full',
  height = 'h-4',
  className,
  lines = 1
}: LoadingSkeletonProps) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'animate-pulse bg-gray-200 rounded',
            width,
            height,
            i === lines - 1 && lines > 1 ? 'w-3/4' : '' // Last line shorter
          )}
        />
      ))}
    </div>
  );
}

interface LoadingOverlayProps {
  isVisible: boolean;
  message?: string;
  progress?: number;
  onCancel?: () => void;
  cancellable?: boolean;
}

export function LoadingOverlay({
  isVisible,
  message = 'Loading…',
  progress,
  onCancel,
  cancellable = false
}: LoadingOverlayProps) {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4 shadow-xl">
        <div className="text-center">
          <LoadingSpinner size="lg" className="mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">{message}</h3>

          {progress !== undefined && (
            <div className="mb-4">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-[width] duration-300 ease-out"
                  style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                />
              </div>
              <p className="text-sm text-gray-600 mt-1">
                {Math.round(progress)}% complete
              </p>
            </div>
          )}

          {cancellable && onCancel && (
            <Button variant="outline" onClick={onCancel} className="mt-2">
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

interface LoadingButtonProps {
  isLoading: boolean;
  children: React.ReactNode;
  loadingText?: string;
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
  variant?: 'default' | 'outline' | 'ghost' | 'destructive';
}

export function LoadingButton({
  isLoading,
  children,
  loadingText,
  className,
  disabled,
  onClick,
  variant = 'default'
}: LoadingButtonProps) {
  return (
    <Button
      variant={variant}
      className={className}
      disabled={disabled || isLoading}
      onClick={onClick}
    >
      {isLoading && <LoadingSpinner size="sm" className="mr-2" />}
      {isLoading ? (loadingText || 'Loading…') : children}
    </Button>
  );
}

interface LoadingCardProps {
  title?: boolean;
  lines?: number;
  className?: string;
}

export function LoadingCard({ title = true, lines = 3, className }: LoadingCardProps) {
  return (
    <div className={cn('border rounded-lg p-4 space-y-3', className)}>
      {title && <LoadingSkeleton height="h-5" width="w-1/2" />}
      <LoadingSkeleton lines={lines} />
    </div>
  );
}

interface LoadingTableProps {
  rows?: number;
  columns?: number;
  className?: string;
}

export function LoadingTable({ rows = 5, columns = 4, className }: LoadingTableProps) {
  return (
    <div className={cn('space-y-2', className)}>
      {/* Header */}
      <div className="flex space-x-4">
        {Array.from({ length: columns }).map((_, i) => (
          <LoadingSkeleton key={`header-${i}`} width="flex-1" height="h-4" />
        ))}
      </div>

      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={`row-${rowIndex}`} className="flex space-x-4">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <LoadingSkeleton
              key={`cell-${rowIndex}-${colIndex}`}
              width="flex-1"
              height="h-3"
            />
          ))}
        </div>
      ))}
    </div>
  );
}

interface LoadingListProps {
  items?: number;
  showAvatar?: boolean;
  className?: string;
}

export function LoadingList({ items = 5, showAvatar = false, className }: LoadingListProps) {
  return (
    <div className={cn('space-y-3', className)}>
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center space-x-3">
          {showAvatar && (
            <LoadingSkeleton width="w-10" height="h-10" className="rounded-full" />
          )}
          <div className="flex-1 space-y-2">
            <LoadingSkeleton width="w-3/4" height="h-4" />
            <LoadingSkeleton width="w-1/2" height="h-3" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Loading state for specific use cases
interface LoadingStateProps {
  type: 'spinner' | 'skeleton' | 'overlay' | 'button' | 'card' | 'table' | 'list';
  isLoading: boolean;
  children?: React.ReactNode;
  className?: string;
  // Additional props for specific types
  message?: string;
  progress?: number;
  onCancel?: () => void;
  lines?: number;
  rows?: number;
  columns?: number;
}

export function LoadingState({
  type,
  isLoading,
  children,
  className,
  ...props
}: LoadingStateProps) {
  if (!isLoading && children) {
    return <>{children}</>;
  }

  switch (type) {
    case 'spinner':
      return <LoadingSpinner className={className} />;
    case 'skeleton':
      return <LoadingSkeleton className={className} lines={props.lines} />;
    case 'overlay':
      return (
        <LoadingOverlay
          isVisible={isLoading}
          message={props.message}
          progress={props.progress}
          onCancel={props.onCancel}
        />
      );
    case 'card':
      return <LoadingCard className={className} lines={props.lines} />;
    case 'table':
      return (
        <LoadingTable
          className={className}
          rows={props.rows}
          columns={props.columns}
        />
      );
    case 'list':
      return <LoadingList className={className} items={props.rows} />;
    default:
      return <LoadingSpinner className={className} />;
  }
}
