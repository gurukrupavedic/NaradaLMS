/**
 * Radio Component - Vedic LMS Design System
 * 
 * Radio inputs for single-choice selections in LMS contexts.
 * Supports user roles, difficulty levels, and preference settings.
 * 
 * @author Vedic LMS Design System
 * @since 2025-06-24
 */

import React from "react";

export interface RadioProps {
  id?: string;
  name: string;
  value: string;
  checked?: boolean;
  disabled?: boolean;
  label?: string;
  description?: string;
  variant?: "blue" | "green" | "purple" | "orange" | "pink" | "indigo" | "teal" | "cyan" | "yellow" | "lime" | "rose" | "emerald";
  size?: "sm" | "md" | "lg";
  onChange?: (value: string) => void;
  className?: string;
}

export interface RadioGroupProps {
  name: string;
  label?: string;
  description?: string;
  options: Array<{
    value: string;
    label: string;
    description?: string;
    disabled?: boolean;
  }>;
  value?: string;
  onChange: (value: string) => void;
  variant?: "blue" | "green" | "purple" | "orange" | "pink" | "indigo" | "teal" | "cyan" | "yellow" | "lime" | "rose" | "emerald";
  size?: "sm" | "md" | "lg";
  direction?: "vertical" | "horizontal";
  className?: string;
}

const sizeClasses = {
  sm: {
    radio: "h-4 w-4",
    label: "text-sm",
    description: "text-xs"
  },
  default: {
    radio: "h-5 w-5",
    label: "text-base",
    description: "text-sm"
  },
  lg: {
    radio: "h-6 w-6",
    label: "text-lg",
    description: "text-base"
  }
};

const variantClasses = {
  blue: {
    checked: "bg-blue-600 border-blue-600",
    unchecked: "border-blue-300 hover:border-blue-400",
    focus: "ring-blue-500 ring-opacity-25",
    dot: "bg-white"
  },
  green: {
    checked: "bg-green-600 border-green-600",
    unchecked: "border-green-300 hover:border-green-400",
    focus: "ring-green-500 ring-opacity-25",
    dot: "bg-white"
  },
  purple: {
    checked: "bg-purple-600 border-purple-600",
    unchecked: "border-purple-300 hover:border-purple-400",
    focus: "ring-purple-500 ring-opacity-25",
    dot: "bg-white"
  },
  orange: {
    checked: "bg-orange-600 border-orange-600",
    unchecked: "border-orange-300 hover:border-orange-400",
    focus: "ring-orange-500 ring-opacity-25",
    dot: "bg-white"
  },
  pink: {
    checked: "bg-pink-600 border-pink-600",
    unchecked: "border-pink-300 hover:border-pink-400",
    focus: "ring-pink-500 ring-opacity-25",
    dot: "bg-white"
  },
  indigo: {
    checked: "bg-indigo-600 border-indigo-600",
    unchecked: "border-indigo-300 hover:border-indigo-400",
    focus: "ring-indigo-500 ring-opacity-25",
    dot: "bg-white"
  },
  teal: {
    checked: "bg-teal-600 border-teal-600",
    unchecked: "border-teal-300 hover:border-teal-400",
    focus: "ring-teal-500 ring-opacity-25",
    dot: "bg-white"
  },
  cyan: {
    checked: "bg-cyan-600 border-cyan-600",
    unchecked: "border-cyan-300 hover:border-cyan-400",
    focus: "ring-cyan-500 ring-opacity-25",
    dot: "bg-white"
  },
  yellow: {
    checked: "bg-yellow-600 border-yellow-600",
    unchecked: "border-yellow-300 hover:border-yellow-400",
    focus: "ring-yellow-500 ring-opacity-25",
    dot: "bg-white"
  },
  lime: {
    checked: "bg-lime-600 border-lime-600",
    unchecked: "border-lime-300 hover:border-lime-400",
    focus: "ring-lime-500 ring-opacity-25",
    dot: "bg-white"
  },
  rose: {
    checked: "bg-rose-600 border-rose-600",
    unchecked: "border-rose-300 hover:border-rose-400",
    focus: "ring-rose-500 ring-opacity-25",
    dot: "bg-white"
  },
  emerald: {
    checked: "bg-emerald-600 border-emerald-600",
    unchecked: "border-emerald-300 hover:border-emerald-400",
    focus: "ring-emerald-500 ring-opacity-25",
    dot: "bg-white"
  }
};

export function Radio({
  id,
  name,
  value,
  checked = false,
  disabled = false,
  label,
  description,
  variant = "blue",
  size = "md",
  onChange,
  className = ""
}: RadioProps) {
  const variantStyle = variantClasses[variant];
  const sizeStyle = sizeClasses[size];
  const radioId = id || `${name}-${value}`;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onChange) {
      onChange(e.target.value);
    }
  };

  return (
    <div className={`flex items-start gap-3 ${className}`}>
      <div className="flex items-center">
        <input
          id={radioId}
          name={name}
          type="radio"
          value={value}
          checked={checked}
          disabled={disabled}
          onChange={handleChange}
          className="sr-only"
        />
        <label
          htmlFor={radioId}
          className={`
            ${sizeStyle.radio} rounded-full border-2 flex items-center justify-center
            cursor-pointer transition-all duration-200 relative
            ${checked 
              ? variantStyle.checked 
              : `bg-white ${variantStyle.unchecked}`
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            focus-within:ring-4 ${variantStyle.focus}
            hover:shadow-sm
          `}
        >
          {checked && (
            <div 
              className={`
                rounded-full ${variantStyle.dot}
                ${size === 'sm' ? 'h-2 w-2' : size === 'lg' ? 'h-3 w-3' : 'h-2.5 w-2.5'}
              `}
            />
          )}
        </label>
      </div>

      {(label || description) && (
        <div className="flex-1">
          {label && (
            <label
              htmlFor={radioId}
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

export function RadioGroup({
  name,
  label,
  description,
  options,
  value,
  onChange,
  variant = "blue",
  size = "md",
  direction = "vertical",
  className = ""
}: RadioGroupProps) {
  return (
    <div className={`space-y-4 ${className}`}>
      {/* Group Header */}
      {(label || description) && (
        <div className="space-y-2">
          {label && (
            <h3 className="text-lg font-semibold text-gray-900">{label}</h3>
          )}
          {description && (
            <p className="text-sm text-gray-600">{description}</p>
          )}
        </div>
      )}

      {/* Options */}
      <div className={`
        ${direction === 'horizontal' 
          ? 'flex flex-wrap gap-6' 
          : 'space-y-3'
        }
      `}>
        {options.map((option) => (
          <Radio
            key={option.value}
            name={name}
            value={option.value}
            label={option.label}
            description={option.description}
            checked={value === option.value}
            disabled={option.disabled}
            variant={variant}
            size={size}
            onChange={onChange}
          />
        ))}
      </div>
    </div>
  );
}

// Educational semantic variants for LMS contexts
export const RadioVariants = {
  // User roles
  userRole: "blue" as const,
  adminRole: "purple" as const,
  teacherRole: "emerald" as const,
  studentRole: "green" as const,
  
  // Content difficulty
  beginner: "green" as const,
  intermediate: "orange" as const,
  advanced: "purple" as const,
  expert: "rose" as const,
  
  // Language preferences
  telugu: "indigo" as const,
  hindi: "orange" as const,
  english: "blue" as const,
  sanskrit: "purple" as const,
  
  // Audio quality
  audioQuality: "orange" as const,
  videoQuality: "cyan" as const,
  
  // Learning preferences
  visual: "pink" as const,
  auditory: "orange" as const,
  kinesthetic: "teal" as const,
  
  // Settings
  notification: "indigo" as const,
  privacy: "purple" as const,
  accessibility: "cyan" as const
};

// Pre-built common option sets for LMS
export const CommonRadioOptions = {
  userRoles: [
    { value: "student", label: "Student", description: "Access learning content and track progress" },
    { value: "teacher", label: "Teacher", description: "Create and manage content, view student progress" },
    { value: "admin", label: "Administrator", description: "Full system access and user management" }
  ],
  
  difficultyLevels: [
    { value: "beginner", label: "Beginner", description: "New to the topic" },
    { value: "intermediate", label: "Intermediate", description: "Some prior knowledge" },
    { value: "advanced", label: "Advanced", description: "Extensive experience" },
    { value: "expert", label: "Expert", description: "Teaching or research level" }
  ],
  
  languages: [
    { value: "telugu", label: "Telugu", description: "తెలుగు భాష" },
    { value: "hindi", label: "Hindi", description: "हिंदी भाषा" },
    { value: "english", label: "English", description: "English language" },
    { value: "sanskrit", label: "Sanskrit", description: "संस्कृत भाषा" }
  ],
  
  audioQuality: [
    { value: "high", label: "High Quality", description: "Best audio experience (requires more bandwidth)" },
    { value: "medium", label: "Medium Quality", description: "Balanced quality and speed" },
    { value: "low", label: "Low Quality", description: "Faster loading (lower bandwidth)" }
  ]
};