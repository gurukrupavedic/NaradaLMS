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
import { X } from "@/lib/icons";
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
  blue: "border-blue-200 shadow-blue-100/50",
  green: "border-green-200 shadow-green-100/50",
  purple: "border-purple-200 shadow-purple-100/50",
  orange: "border-orange-200 shadow-orange-100/50",
  pink: "border-pink-200 shadow-pink-100/50",
  indigo: "border-indigo-200 shadow-indigo-100/50",
  teal: "border-teal-200 shadow-teal-100/50",
  cyan: "border-cyan-200 shadow-cyan-100/50",
  yellow: "border-yellow-200 shadow-yellow-100/50",
  lime: "border-lime-200 shadow-lime-100/50",
  rose: "border-rose-200 shadow-rose-100/50",
  emerald: "border-emerald-200 shadow-emerald-100/50"
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
      className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200"
      onClick={handleBackdropClick}
    >
      <div 
        className={`
          bg-white rounded-xl shadow-2xl border ${variantClasses[variant]}
          ${sizeClasses[size]} w-full mx-auto transform transition-all duration-300
          animate-in zoom-in-95 slide-in-from-bottom-4
          ${className}
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-start justify-between p-6 border-b border-gray-100">
            <div className="flex-1">
              {title && (
                <h2 className="text-2xl font-bold text-gray-900 leading-tight">{title}</h2>
              )}
              {description && (
                <p className="text-gray-600 mt-2 leading-relaxed">{description}</p>
              )}
            </div>
            {showCloseButton && (
              <button
                onClick={onClose}
                className="ml-4 p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
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
    <div className={`p-6 border-b border-gray-100 ${className}`}>
      {children}
    </div>
  );
}

export function DialogTitle({ children, className = "" }: DialogTitleProps) {
  return (
    <h2 className={`text-2xl font-bold text-gray-900 leading-tight ${className}`}>
      {children}
    </h2>
  );
}

export function DialogDescription({ children, className = "" }: DialogDescriptionProps) {
  return (
    <p className={`text-gray-600 mt-2 leading-relaxed ${className}`}>
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
    <div className={`p-6 border-t border-gray-100 bg-gray-50/50 rounded-b-xl flex justify-end gap-3 ${className}`}>
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
      className="overflow-hidden"
    >
      <div className="p-6 text-center">
        <div className={`
          w-12 h-12 mx-auto mb-4 rounded-full flex items-center justify-center
          ${destructive ? 'bg-rose-100' : `bg-${variant}-100`}
        `}>
          {destructive ? (
            <svg className="w-6 h-6 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          ) : (
            <svg className={`w-6 h-6 text-${variant}-600`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
        </div>
        
        <DialogTitle className="mb-2">{title}</DialogTitle>
        <DialogDescription className="mb-6">{description}</DialogDescription>
        
        <div className="flex justify-center gap-3">
          <Button
            variant="outline"
            color="gray"
            onClick={onClose}
            className="min-w-20"
          >
            {cancelText}
          </Button>
          <Button
            variant="solid"
            color={confirmVariant}
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="min-w-20"
          >
            {confirmText}
          </Button>
        </div>
      </div>
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