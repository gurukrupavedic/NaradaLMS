/**
 * Modern Colorful Textarea Component - LMS Design System v1.0
 * 
 * Enhanced textarea component with vibrant colors, educational variants, and auto-resize.
 * Perfect for content creation, descriptions, and multi-line text input in LMS.
 * 
 * Features:
 * - 12 vibrant focus color variants matching Input component
 * - Auto-resize functionality with min/max height controls
 * - Character counting and validation
 * - Educational semantic variants for LMS contexts
 * 
 * @author LMS Design System v1.0
 * @since 2025-06-24
 */

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const textareaVariants = cva(
  "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200 resize-none",
  {
    variants: {
      variant: {
        default: "focus-visible:border-blue-500 focus-visible:shadow-[0_0_0_3px_rgba(59,130,246,0.1)]",
        blue: "focus-visible:border-blue-500 focus-visible:shadow-[0_0_0_3px_rgba(59,130,246,0.15)]",
        green: "focus-visible:border-green-500 focus-visible:shadow-[0_0_0_3px_rgba(34,197,94,0.15)]",
        purple: "focus-visible:border-purple-500 focus-visible:shadow-[0_0_0_3px_rgba(147,51,234,0.15)]",
        orange: "focus-visible:border-orange-500 focus-visible:shadow-[0_0_0_3px_rgba(249,115,22,0.15)]",
        pink: "focus-visible:border-pink-500 focus-visible:shadow-[0_0_0_3px_rgba(236,72,153,0.15)]",
        indigo: "focus-visible:border-indigo-500 focus-visible:shadow-[0_0_0_3px_rgba(99,102,241,0.15)]",
        teal: "focus-visible:border-teal-500 focus-visible:shadow-[0_0_0_3px_rgba(20,184,166,0.15)]",
        cyan: "focus-visible:border-cyan-500 focus-visible:shadow-[0_0_0_3px_rgba(8,145,178,0.15)]",
        yellow: "focus-visible:border-yellow-500 focus-visible:shadow-[0_0_0_3px_rgba(202,138,4,0.15)]",
        lime: "focus-visible:border-lime-500 focus-visible:shadow-[0_0_0_3px_rgba(101,163,13,0.15)]",
        rose: "focus-visible:border-rose-500 focus-visible:shadow-[0_0_0_3px_rgba(244,63,94,0.15)]",
        emerald: "focus-visible:border-emerald-500 focus-visible:shadow-[0_0_0_3px_rgba(16,185,129,0.15)]"
      },
      size: {
        sm: "min-h-[60px] px-2 py-1.5 text-xs",
        default: "min-h-[80px] px-3 py-2 text-sm",
        lg: "min-h-[120px] px-4 py-3 text-base"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

// Educational semantic variants
const educationalVariants = {
  // Content creation
  description: "purple",
  summary: "teal",
  notes: "cyan",
  commentary: "orange",
  
  // Learning contexts
  response: "blue",
  feedback: "green",
  question: "pink",
  instructions: "indigo"
} as const;

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement>,
    VariantProps<typeof textareaVariants> {
  educational?: keyof typeof educationalVariants;
  autoResize?: boolean;
  minHeight?: number;
  maxHeight?: number;
  showCharCount?: boolean;
  maxLength?: number;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ 
    className, 
    variant, 
    size, 
    educational, 
    autoResize = true, 
    minHeight = 80, 
    maxHeight = 300,
    showCharCount = false,
    maxLength,
    value,
    onChange,
    ...props 
  }, ref) => {
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);
    const [charCount, setCharCount] = React.useState(0);
    
    // Use educational variant if provided
    const finalVariant = educational ? educationalVariants[educational] : variant;
    
    // Auto-resize functionality
    const adjustHeight = React.useCallback(() => {
      const textarea = textareaRef.current;
      if (textarea && autoResize) {
        textarea.style.height = 'auto';
        const scrollHeight = textarea.scrollHeight;
        const newHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight);
        textarea.style.height = `${newHeight}px`;
      }
    }, [autoResize, minHeight, maxHeight]);
    
    // Handle value changes
    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      setCharCount(newValue.length);
      onChange?.(e);
      
      // Trigger resize on next frame
      requestAnimationFrame(adjustHeight);
    };
    
    // Initial setup
    React.useEffect(() => {
      if (value) {
        setCharCount(String(value).length);
      }
      adjustHeight();
    }, [value, adjustHeight]);
    
    // Merge refs
    React.useImperativeHandle(ref, () => textareaRef.current!);
    
    return (
      <div className="relative">
        <textarea
          ref={textareaRef}
          className={cn(textareaVariants({ variant: finalVariant, size }), className)}
          style={{ 
            minHeight: `${minHeight}px`,
            maxHeight: autoResize ? `${maxHeight}px` : undefined 
          }}
          value={value}
          onChange={handleChange}
          maxLength={maxLength}
          {...props}
        />
        
        {showCharCount && (
          <div className="absolute bottom-2 right-3 text-xs text-gray-500">
            {charCount}{maxLength && ` / ${maxLength}`}
          </div>
        )}
      </div>
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea, textareaVariants };