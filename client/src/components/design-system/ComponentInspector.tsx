/**
 * Component Inspector - Design System Utility
 * 
 * Provides copy-to-clipboard functionality and visual property inspection
 * for design system components. Enables precise component referencing.
 * 
 * @author LMS Design System v1.0
 * @since 2025-06-24
 */

import React, { useState } from "react";
import { Copy, Check, Eye, Settings } from "lucide-react";
import { Button } from "./Button";
import { Badge } from "./Badge";

export interface ComponentInspectorProps {
  componentName: string;
  variant?: string;
  size?: string;
  props?: Record<string, any>;
  allVariants?: string[];
  allSizes?: string[];
  onVariantChange?: (variant: string) => void;
  onSizeChange?: (size: string) => void;
  onIconChange?: (icon: string) => void;
  onPropsChange?: React.Dispatch<React.SetStateAction<any>> | ((props: Record<string, any>) => void);
  className?: string;
}

export interface ComponentCardProps {
  title: string;
  description?: string;
  componentName: string;
  variant?: string;
  size?: string;
  props?: Record<string, any>;
  allVariants?: string[];
  allSizes?: string[];
  onVariantChange?: (variant: string) => void;
  onSizeChange?: (size: string) => void;
  onPropsChange?: React.Dispatch<React.SetStateAction<any>> | ((props: Record<string, any>) => void);
  showInspector?: boolean;
  children: React.ReactNode;
  className?: string;
}

const colorVariants = [
  "blue", "green", "purple", "orange", "pink", "indigo", 
  "teal", "cyan", "yellow", "lime", "rose", "emerald"
];

const defaultSizeOptions = ["sm", "md", "lg"];

// Define toggleable props for each component
function getToggleableProps(componentName: string): string[] {
  const propMap: Record<string, string[]> = {
    Button: ["disabled", "loading"],
    Input: ["disabled"],
    Textarea: ["disabled"],
    Select: ["disabled"],
    Checkbox: ["disabled"],
    Radio: ["disabled"],
    Switch: ["disabled"],
    Badge: ["interactive"],
    Progress: ["striped"],
    Table: ["striped", "hoverable"],
    Breadcrumb: ["showHome"],
    Tabs: [],
    Alert: [],
    Card: ["interactive"],
    Tooltip: [],
    Slider: ["showValue", "disabled"],
    AudioSlider: ["showVolume"],
    ProgressSlider: ["showPercentage"],
    AudioControls: ["isPlaying", "showSkipButtons", "showPlaybackRate", "showVolumeControl"],
    TextSegment: ["isMapped", "showActions"]
  };
  
  return propMap[componentName] || [];
}

// Color mapping for visual indicators
const colorMap: Record<string, string> = {
  blue: "#3b82f6",
  green: "#10b981", 
  purple: "#8b5cf6",
  orange: "#f59e0b",
  pink: "#ec4899",
  indigo: "#6366f1",
  teal: "#14b8a6",
  cyan: "#06b6d4",
  yellow: "#eab308",
  lime: "#65a30d",
  rose: "#f43f5e",
  emerald: "#059669"
};

function generateComponentReference(
  componentName: string, 
  variant?: string, 
  size?: string, 
  props?: Record<string, any>
): string {
  const parts = [componentName];
  
  if (variant && variant !== "blue") {
    parts.push(variant);
  }
  
  if (size && size !== "md") {
    parts.push(size);
  }

  // Add notable props
  const notableProps = [];
  if (props?.selectable === true) notableProps.push("selectable");
  if (props?.sortable === true) notableProps.push("sortable");
  if (props?.destructive === true) notableProps.push("destructive");
  if (props?.loading === true) notableProps.push("loading");
  if (props?.disabled === true) notableProps.push("disabled");
  if (props?.showVolume === true) notableProps.push("showVolume");
  if (props?.showValue === true) notableProps.push("showValue");
  if (props?.showHome === true) notableProps.push("showHome");
  if (props?.striped === true) notableProps.push("striped");
  if (props?.hoverable === true) notableProps.push("hoverable");
  if (props?.showPercentage === true) notableProps.push("showPercentage");
  
  if (notableProps.length > 0) {
    return `${parts.join(".")}(${notableProps.join(", ")})`;
  }
  
  return parts.join(".");
}

export function ComponentInspector({
  componentName,
  variant = "blue",
  size = "md",
  props = {},
  allVariants = colorVariants,
  allSizes = defaultSizeOptions,
  onVariantChange,
  onSizeChange,
  onIconChange,
  onPropsChange,
  className = ""
}: ComponentInspectorProps) {
  
  // Icon options for components that support icons
  const iconOptions = ["Info", "CheckCircle", "AlertCircle", "XCircle", "HelpCircle", "Star", "Crown", "Shield"];
  const [copied, setCopied] = useState(false);
  const [showProps, setShowProps] = useState(false);

  const reference = generateComponentReference(componentName, variant, size, props);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(reference);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const notableProps = Object.entries(props).filter(([key, value]) => 
    value === true && [
      "selectable", "sortable", "destructive", "loading", "disabled", 
      "showVolume", "showValue", "showHome", "striped", "hoverable", 
      "showPercentage", "interactive", "glow"
    ].includes(key)
  );

  return (
    <div className={`bg-gray-50/80 border border-gray-200 rounded-lg p-4 space-y-3 ${className}`}>
      {/* Component Reference with Copy */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <code className="text-sm font-mono bg-white px-3 py-1 rounded border font-semibold text-gray-900">
            {reference}
          </code>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="h-8 w-8 p-0"
          >
            {copied ? (
              <Check className="h-3 w-3 text-green-600" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </Button>
        </div>
        
        {notableProps.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowProps(!showProps)}
            className="h-8 w-8 p-0"
          >
            <Settings className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Color Variants */}
      {allVariants.length > 0 && onVariantChange && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-600">Colors:</p>
          <div className="flex flex-wrap gap-1">
            {allVariants.map((colorVariant) => (
              <button
                key={colorVariant}
                onClick={() => onVariantChange(colorVariant)}
                className={`
                  w-6 h-6 rounded-full border-2 transition-all duration-150
                  ${variant === colorVariant 
                    ? 'border-gray-800 ring-2 ring-gray-300 scale-110' 
                    : 'border-white hover:border-gray-400 hover:scale-105'
                  }
                `}
                style={{ backgroundColor: colorMap[colorVariant] }}
                title={colorVariant}
              />
            ))}
          </div>
        </div>
      )}

      {/* Size Options */}
      {allSizes.length > 0 && onSizeChange && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-600">Sizes:</p>
          <div className="flex gap-1">
            {allSizes.map((sizeOption) => (
              <button
                key={sizeOption}
                onClick={() => onSizeChange(sizeOption)}
                className={`
                  px-2 py-1 text-xs font-medium rounded transition-all duration-150
                  ${size === sizeOption 
                    ? 'bg-gray-900 text-white' 
                    : 'bg-white text-gray-600 hover:bg-gray-100 border'
                  }
                `}
              >
                {sizeOption}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Props Display */}
      {showProps && (
        <div className="space-y-2 pt-2 border-t border-gray-200">
          <p className="text-xs font-medium text-gray-600">Active Properties:</p>
          <div className="flex flex-wrap gap-1">
            {getToggleableProps(componentName).map((propName) => {
              const isActive = props[propName] === true;
              return (
                <button
                  key={propName}
                  onClick={() => {
                    if (onPropsChange) {
                      onPropsChange({
                        ...props,
                        [propName]: !isActive
                      });
                    }
                  }}
                  className={`
                    px-2 py-1 text-xs font-medium rounded transition-all duration-150
                    ${isActive 
                      ? 'bg-green-600 text-white shadow-sm' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border'
                    }
                  `}
                >
                  {propName}
                </button>
              );
            })}
          </div>
        </div>
      )}
      
      {copied && (
        <div className="text-xs text-green-600 font-medium">
          ✓ Copied to clipboard
        </div>
      )}
    </div>
  );
}

export function ComponentCard({
  title,
  description,
  componentName,
  variant = "blue",
  size = "md",
  props = {},
  allVariants = colorVariants,
  allSizes = defaultSizeOptions,
  onVariantChange,
  onSizeChange,
  onPropsChange,
  showInspector = true,
  children,
  className = ""
}: ComponentCardProps) {
  return (
    <div className={`bg-white rounded-lg border border-gray-200 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        {description && (
          <p className="text-sm text-gray-600 mt-1">{description}</p>
        )}
      </div>

      {/* Component Demo */}
      <div className="p-6">
        {children}
      </div>

      {/* Inspector */}
      {showInspector && (
        <div className="border-t border-gray-200">
          <ComponentInspector
            componentName={componentName}
            variant={variant}
            size={size}
            props={props}
            allVariants={allVariants}
            allSizes={allSizes}
            onVariantChange={onVariantChange}
            onSizeChange={onSizeChange}
            onPropsChange={onPropsChange}
          />
        </div>
      )}
    </div>
  );
}