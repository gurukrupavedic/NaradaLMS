/**
 * Dialog Component - Vedic LMS Design System
 * 
 * Modal dialogs for critical user interactions in the LMS.
 * Supports confirmation dialogs, forms, and content overlays.
 * 
 * @author Vedic LMS Design System
 * @since 2025-06-24
 */

import React from "react";
import { X } from "lucide-react";
import { Button } from "./Button";

export interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children?: React.ReactNode;
  variant?: "blue" | "green" | "purple" | "orange" | "pink" | "indigo" | "teal" | "cyan" | "yellow" | "lime" | "rose" | "emerald";
  size?: "sm" | "md" | "lg" | "xl";
  showCloseButton?: boolean;
  className?: string;
}

export interface DialogHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export interface DialogTitleProps {
  children: React.ReactNode;
  className?: string;
}

export interface DialogDescriptionProps {
  children: React.ReactNode;
  className?: string;
}

export interface DialogContentProps {
  children: React.ReactNode;
  className?: string;
}

export interface DialogFooterProps {
  children: React.ReactNode;
  className?: string;
}

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "blue" | "green" | "purple" | "orange" | "pink" | "indigo" | "teal" | "cyan" | "yellow" | "lime" | "rose" | "emerald";
  destructive?: boolean;
}

const sizeClasses = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl"
};

const variantClasses = {
  blue: "border-blue-200",
  green: "border-green-200",
  purple: "border-purple-200",
  orange: "border-orange-200",
  pink: "border-pink-200",
  indigo: "border-indigo-200",
  teal: "border-teal-200",
  cyan: "border-cyan-200",
  yellow: "border-yellow-200",
  lime: "border-lime-200",
  rose: "border-rose-200",
  emerald: "border-emerald-200"
};

export function Dialog({
  isOpen,
  onClose,
  title,
  description,
  children,
  variant = "blue",
  size = "md",
  showCloseButton = true,
  className = ""
}: DialogProps) {
  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={handleBackdropClick}
    >
      <div 
        className={`
          bg-white rounded-lg shadow-2xl border-2 ${variantClasses[variant]}
          ${sizeClasses[size]} w-full mx-auto transform transition-all
          ${className}
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              {title && (
                <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
              )}
              {description && (
                <p className="text-sm text-gray-600 mt-1">{description}</p>
              )}
            </div>
            {showCloseButton && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
}

export function DialogHeader({ children, className = "" }: DialogHeaderProps) {
  return (
    <div className={`p-6 border-b border-gray-200 ${className}`}>
      {children}
    </div>
  );
}

export function DialogTitle({ children, className = "" }: DialogTitleProps) {
  return (
    <h2 className={`text-xl font-semibold text-gray-900 ${className}`}>
      {children}
    </h2>
  );
}

export function DialogDescription({ children, className = "" }: DialogDescriptionProps) {
  return (
    <p className={`text-sm text-gray-600 mt-1 ${className}`}>
      {children}
    </p>
  );
}

export function DialogContent({ children, className = "" }: DialogContentProps) {
  return (
    <div className={`p-6 ${className}`}>
      {children}
    </div>
  );
}

export function DialogFooter({ children, className = "" }: DialogFooterProps) {
  return (
    <div className={`p-6 border-t border-gray-200 flex justify-end gap-3 ${className}`}>
      {children}
    </div>
  );
}

/**
 * Confirmation Dialog - Pre-built for common LMS actions
 * Perfect for delete confirmations, user actions, etc.
 */
export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "blue",
  destructive = false
}: ConfirmDialogProps) {
  const confirmVariant = destructive ? "rose" : variant;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      variant={variant}
      size="sm"
      showCloseButton={false}
    >
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      
      <DialogFooter>
        <Button
          variant="outline"
          onClick={onClose}
        >
          {cancelText}
        </Button>
        <Button
          variant={confirmVariant}
          onClick={() => {
            onConfirm();
            onClose();
          }}
        >
          {confirmText}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

// Educational semantic variants for LMS contexts
export const DialogVariants = {
  // User management
  userInvite: "blue" as const,
  userEdit: "green" as const,
  userDelete: "rose" as const,
  
  // Content management
  contentCreate: "emerald" as const,
  contentEdit: "purple" as const,
  contentDelete: "rose" as const,
  contentPublish: "green" as const,
  
  // Audio management
  audioUpload: "orange" as const,
  audioEdit: "purple" as const,
  audioDelete: "rose" as const,
  
  // General actions
  save: "green" as const,
  warning: "yellow" as const,
  error: "rose" as const,
  info: "blue" as const
};