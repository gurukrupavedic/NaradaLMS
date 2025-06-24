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
    checked: "bg-blue-600 border-blue-600 text-white",
    unchecked: "border-blue-300 hover:border-blue-400",
    focus: "ring-blue-500 ring-opacity-25"
  },
  green: {
    checked: "bg-green-600 border-green-600 text-white",
    unchecked: "border-green-300 hover:border-green-400",
    focus: "ring-green-500 ring-opacity-25"
  },
  purple: {
    checked: "bg-purple-600 border-purple-600 text-white",
    unchecked: "border-purple-300 hover:border-purple-400",
    focus: "ring-purple-500 ring-opacity-25"
  },
  orange: {
    checked: "bg-orange-600 border-orange-600 text-white",
    unchecked: "border-orange-300 hover:border-orange-400",
    focus: "ring-orange-500 ring-opacity-25"
  },
  pink: {
    checked: "bg-pink-600 border-pink-600 text-white",
    unchecked: "border-pink-300 hover:border-pink-400",
    focus: "ring-pink-500 ring-opacity-25"
  },
  indigo: {
    checked: "bg-indigo-600 border-indigo-600 text-white",
    unchecked: "border-indigo-300 hover:border-indigo-400",
    focus: "ring-indigo-500 ring-opacity-25"
  },
  teal: {
    checked: "bg-teal-600 border-teal-600 text-white",
    unchecked: "border-teal-300 hover:border-teal-400",
    focus: "ring-teal-500 ring-opacity-25"
  },
  cyan: {
    checked: "bg-cyan-600 border-cyan-600 text-white",
    unchecked: "border-cyan-300 hover:border-cyan-400",
    focus: "ring-cyan-500 ring-opacity-25"
  },
  yellow: {
    checked: "bg-yellow-600 border-yellow-600 text-white",
    unchecked: "border-yellow-300 hover:border-yellow-400",
    focus: "ring-yellow-500 ring-opacity-25"
  },
  lime: {
    checked: "bg-lime-600 border-lime-600 text-white",
    unchecked: "border-lime-300 hover:border-lime-400",
    focus: "ring-lime-500 ring-opacity-25"
  },
  rose: {
    checked: "bg-rose-600 border-rose-600 text-white",
    unchecked: "border-rose-300 hover:border-rose-400",
    focus: "ring-rose-500 ring-opacity-25"
  },
  emerald: {
    checked: "bg-emerald-600 border-emerald-600 text-white",
    unchecked: "border-emerald-300 hover:border-emerald-400",
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
            cursor-pointer transition-all duration-200
            ${checked || indeterminate 
              ? variantStyle.checked 
              : `bg-white ${variantStyle.unchecked}`
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            focus-within:ring-4 ${variantStyle.focus}
            hover:shadow-sm
          `}
        >
          {indeterminate ? (
            <Minus className="h-3 w-3" />
          ) : checked ? (
            <Check className="h-3 w-3" />
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