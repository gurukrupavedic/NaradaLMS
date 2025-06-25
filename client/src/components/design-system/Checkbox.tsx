/**
 * Checkbox Component - Vedic LMS Design System
 * 
 * Checkbox inputs for multi-selection in LMS contexts.
 * Supports bulk operations, permissions, and content selection.
 * 
 * @author Vedic LMS Design System
 * @since 2025-06-24
 */

import React from "react";
import { Check, Minus } from "lucide-react";

export interface CheckboxProps {
  id?: string;
  name?: string;
  checked?: boolean;
  indeterminate?: boolean;
  disabled?: boolean;
  label?: string;
  description?: string;
  variant?: "blue" | "green" | "purple" | "orange" | "pink" | "indigo" | "teal" | "cyan" | "yellow" | "lime" | "rose" | "emerald";
  size?: "sm" | "md" | "lg";
  onChange?: (checked: boolean) => void;
  className?: string;
}

export interface CheckboxGroupProps {
  label?: string;
  description?: string;
  options: Array<{
    id: string;
    label: string;
    description?: string;
    disabled?: boolean;
  }>;
  value: string[];
  onChange: (value: string[]) => void;
  variant?: "blue" | "green" | "purple" | "orange" | "pink" | "indigo" | "teal" | "cyan" | "yellow" | "lime" | "rose" | "emerald";
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: {
    checkbox: "h-4 w-4",
    label: "text-sm",
    description: "text-xs"
  },
  md: {
    checkbox: "h-5 w-5",
    label: "text-base",
    description: "text-sm"
  },
  lg: {
    checkbox: "h-6 w-6",
    label: "text-lg",
    description: "text-base"
  }
};

const variantClasses = {
  blue: {
    checked: "bg-gradient-to-br from-blue-500 to-blue-600 border-blue-500 text-white shadow-[0_4px_14px_rgba(59,130,246,0.8)]",
    unchecked: "border-blue-300 hover:border-blue-400 hover:shadow-[0_4px_14px_rgba(59,130,246,0.15)]",
    focus: "ring-blue-500 ring-opacity-25"
  },
  green: {
    checked: "bg-gradient-to-br from-green-500 to-green-600 border-green-500 text-white shadow-[0_4px_14px_rgba(34,197,94,0.8)]",
    unchecked: "border-green-300 hover:border-green-400 hover:shadow-[0_4px_14px_rgba(34,197,94,0.15)]",
    focus: "ring-green-500 ring-opacity-25"
  },
  purple: {
    checked: "bg-gradient-to-br from-purple-500 to-purple-600 border-purple-500 text-white shadow-[0_4px_14px_rgba(139,92,246,0.8)]",
    unchecked: "border-purple-300 hover:border-purple-400 hover:shadow-[0_4px_14px_rgba(139,92,246,0.15)]",
    focus: "ring-purple-500 ring-opacity-25"
  },
  orange: {
    checked: "bg-gradient-to-br from-orange-500 to-orange-600 border-orange-500 text-white shadow-[0_4px_14px_rgba(245,158,11,0.8)]",
    unchecked: "border-orange-300 hover:border-orange-400 hover:shadow-[0_4px_14px_rgba(245,158,11,0.15)]",
    focus: "ring-orange-500 ring-opacity-25"
  },
  pink: {
    checked: "bg-gradient-to-br from-pink-500 to-pink-600 border-pink-500 text-white shadow-[0_4px_14px_rgba(236,72,153,0.8)]",
    unchecked: "border-pink-300 hover:border-pink-400 hover:shadow-[0_4px_14px_rgba(236,72,153,0.15)]",
    focus: "ring-pink-500 ring-opacity-25"
  },
  indigo: {
    checked: "bg-gradient-to-br from-indigo-500 to-indigo-600 border-indigo-500 text-white shadow-[0_4px_14px_rgba(99,102,241,0.8)]",
    unchecked: "border-indigo-300 hover:border-indigo-400 hover:shadow-[0_4px_14px_rgba(99,102,241,0.15)]",
    focus: "ring-indigo-500 ring-opacity-25"
  },
  teal: {
    checked: "bg-gradient-to-br from-teal-500 to-teal-600 border-teal-500 text-white shadow-[0_4px_14px_rgba(20,184,166,0.8)]",
    unchecked: "border-teal-300 hover:border-teal-400 hover:shadow-[0_4px_14px_rgba(20,184,166,0.15)]",
    focus: "ring-teal-500 ring-opacity-25"
  },
  cyan: {
    checked: "bg-gradient-to-br from-cyan-500 to-cyan-600 border-cyan-500 text-white shadow-[0_4px_14px_rgba(6,182,212,0.8)]",
    unchecked: "border-cyan-300 hover:border-cyan-400 hover:shadow-[0_4px_14px_rgba(6,182,212,0.15)]",
    focus: "ring-cyan-500 ring-opacity-25"
  },
  yellow: {
    checked: "bg-gradient-to-br from-yellow-500 to-yellow-600 border-yellow-500 text-white shadow-[0_4px_14px_rgba(234,179,8,0.8)]",
    unchecked: "border-yellow-300 hover:border-yellow-400 hover:shadow-[0_4px_14px_rgba(234,179,8,0.15)]",
    focus: "ring-yellow-500 ring-opacity-25"
  },
  lime: {
    checked: "bg-gradient-to-br from-lime-500 to-lime-600 border-lime-500 text-white shadow-[0_4px_14px_rgba(101,163,13,0.8)]",
    unchecked: "border-lime-300 hover:border-lime-400 hover:shadow-[0_4px_14px_rgba(101,163,13,0.15)]",
    focus: "ring-lime-500 ring-opacity-25"
  },
  rose: {
    checked: "bg-gradient-to-br from-rose-500 to-rose-600 border-rose-500 text-white shadow-[0_4px_14px_rgba(244,63,94,0.8)]",
    unchecked: "border-rose-300 hover:border-rose-400 hover:shadow-[0_4px_14px_rgba(244,63,94,0.15)]",
    focus: "ring-rose-500 ring-opacity-25"
  },
  emerald: {
    checked: "bg-gradient-to-br from-emerald-500 to-emerald-600 border-emerald-500 text-white shadow-[0_4px_14px_rgba(5,150,105,0.8)]",
    unchecked: "border-emerald-300 hover:border-emerald-400 hover:shadow-[0_4px_14px_rgba(5,150,105,0.15)]",
    focus: "ring-emerald-500 ring-opacity-25"
  }
};

export function Checkbox({
  id,
  name,
  checked = false,
  indeterminate = false,
  disabled = false,
  label,
  description,
  variant = "blue",
  size = "md",
  onChange,
  className = ""
}: CheckboxProps) {
  const variantStyle = variantClasses[variant];
  const sizeStyle = sizeClasses[size];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onChange) {
      onChange(e.target.checked);
    }
  };

  return (
    <div className={`flex items-start gap-3 ${className}`}>
      <div className="flex items-center">
        <input
          id={id}
          name={name}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={handleChange}
          className="sr-only"
        />
        <label
          htmlFor={id}
          className={`
            ${sizeStyle.checkbox} rounded border-2 flex items-center justify-center
            cursor-pointer transition-all duration-300 relative transform
            ${checked || indeterminate 
              ? variantStyle.checked 
              : `bg-white ${variantStyle.unchecked} hover:scale-105`
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            focus-within:ring-4 ${variantStyle.focus}
            hover:shadow-lg active:scale-95
          `}
        >
          {indeterminate ? (
            <Minus className="h-3 w-3 drop-shadow-sm" />
          ) : checked ? (
            <Check className="h-3 w-3 drop-shadow-sm" />
          ) : null}
        </label>
      </div>

      {(label || description) && (
        <div className="flex-1">
          {label && (
            <label
              htmlFor={id}
              className={`
                block font-medium text-gray-900 cursor-pointer
                ${sizeStyle.label}
                ${disabled ? 'opacity-50' : ''}
              `}
            >
              {label}
            </label>
          )}
          {description && (
            <p className={`text-gray-600 mt-1 ${sizeStyle.description} ${disabled ? 'opacity-50' : ''}`}>
              {description}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function CheckboxGroup({
  label,
  description,
  options,
  value,
  onChange,
  variant = "blue",
  size = "md",
  className = ""
}: CheckboxGroupProps) {
  const handleCheckboxChange = (optionId: string, checked: boolean) => {
    if (checked) {
      onChange([...value, optionId]);
    } else {
      onChange(value.filter(id => id !== optionId));
    }
  };

  const isIndeterminate = value.length > 0 && value.length < options.length;
  const isAllChecked = value.length === options.length;

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onChange(options.map(option => option.id));
    } else {
      onChange([]);
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Group Header */}
      {(label || description) && (
        <div className="space-y-2">
          {label && (
            <div className="flex items-center gap-3">
              <Checkbox
                id={`${label}-select-all`}
                checked={isAllChecked}
                indeterminate={isIndeterminate}
                variant={variant}
                size={size}
                onChange={handleSelectAll}
              />
              <label 
                htmlFor={`${label}-select-all`}
                className="text-lg font-semibold text-gray-900 cursor-pointer"
              >
                {label}
              </label>
            </div>
          )}
          {description && (
            <p className="text-sm text-gray-600 ml-8">{description}</p>
          )}
        </div>
      )}

      {/* Options */}
      <div className="space-y-3 ml-8">
        {options.map((option) => (
          <Checkbox
            key={option.id}
            id={option.id}
            label={option.label}
            description={option.description}
            checked={value.includes(option.id)}
            disabled={option.disabled}
            variant={variant}
            size={size}
            onChange={(checked) => handleCheckboxChange(option.id, checked)}
          />
        ))}
      </div>
    </div>
  );
}

// Educational semantic variants for LMS contexts
export const CheckboxVariants = {
  // Content selection
  contentSelect: "blue" as const,
  chapterSelect: "green" as const,
  audioSelect: "orange" as const,
  
  // User permissions
  userPermission: "purple" as const,
  adminPermission: "rose" as const,
  teacherPermission: "emerald" as const,
  
  // Learning progress
  chapterComplete: "green" as const,
  taskComplete: "teal" as const,
  assessmentPass: "emerald" as const,
  
  // Settings and preferences
  notification: "indigo" as const,
  privacy: "purple" as const,
  accessibility: "cyan" as const
};