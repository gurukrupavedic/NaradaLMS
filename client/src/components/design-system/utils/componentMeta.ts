/**
 * Component Metadata Utilities
 * 
 * Centralized component configuration and metadata for the inspector system.
 * Defines available variants, sizes, and properties for each component.
 * 
 * @author Vedic LMS Design System
 * @since 2025-06-24
 */

export const colorVariants = [
  "blue", "green", "purple", "orange", "pink", "indigo", 
  "teal", "cyan", "yellow", "lime", "rose", "emerald"
];

export const sizeOptions = {
  small: ["sm", "md", "lg"],
  full: ["sm", "md", "lg", "xl"],
  selectOnly: ["sm", "md", "lg"] // Select component doesn't support xl
};

export interface ComponentConfig {
  name: string;
  variants: string[];
  sizes: string[];
  commonProps: string[];
  description: string;
  category: "core" | "form" | "data" | "navigation" | "specialized";
}

export const componentConfigs: Record<string, ComponentConfig> = {
  // Core Components
  Button: {
    name: "Button",
    variants: colorVariants,
    sizes: sizeOptions.small,
    commonProps: ["destructive", "loading", "disabled"],
    description: "Primary action buttons with multiple variants",
    category: "core"
  },
  
  Card: {
    name: "Card",
    variants: colorVariants,
    sizes: [],
    commonProps: ["glow", "interactive"],
    description: "Container cards with optional glow effects",
    category: "core"
  },
  
  Input: {
    name: "Input",
    variants: colorVariants,
    sizes: sizeOptions.small,
    commonProps: ["disabled", "required"],
    description: "Text input fields with focus color variants",
    category: "core"
  },
  
  Badge: {
    name: "Badge",
    variants: colorVariants,
    sizes: sizeOptions.small,
    commonProps: [],
    description: "Status indicators and labels",
    category: "core"
  },
  
  Progress: {
    name: "Progress",
    variants: colorVariants,
    sizes: sizeOptions.small,
    commonProps: ["animated"],
    description: "Progress bars and circular indicators",
    category: "core"
  },

  // Form Components
  Select: {
    name: "Select",
    variants: colorVariants,
    sizes: sizeOptions.selectOnly,
    commonProps: ["disabled", "required"],
    description: "Dropdown selection menus (xl not supported)",
    category: "form"
  },

  Checkbox: {
    name: "Checkbox",
    variants: colorVariants,
    sizes: sizeOptions.small,
    commonProps: ["disabled", "indeterminate"],
    description: "Multi-selection checkboxes",
    category: "form"
  },
  
  Radio: {
    name: "Radio",
    variants: colorVariants,
    sizes: sizeOptions.small,
    commonProps: ["disabled"],
    description: "Single-choice radio buttons",
    category: "form"
  },
  
  Dialog: {
    name: "Dialog",
    variants: colorVariants,
    sizes: sizeOptions.full,
    commonProps: ["destructive", "showCloseButton"],
    description: "Modal dialogs and confirmations",
    category: "form"
  },
  
  Switch: {
    name: "Switch",
    variants: colorVariants,
    sizes: sizeOptions.small,
    commonProps: ["disabled"],
    description: "Toggle switches for binary choices",
    category: "form"
  },

  // Data Components
  Table: {
    name: "Table",
    variants: colorVariants,
    sizes: sizeOptions.small,
    commonProps: ["selectable", "sortable", "striped", "hoverable"],
    description: "Data tables with sorting and selection",
    category: "data"
  },
  
  DataTable: {
    name: "DataTable",
    variants: colorVariants,
    sizes: sizeOptions.small,
    commonProps: ["selectable", "sortable", "pagination"],
    description: "Enhanced tables with pagination and actions",
    category: "data"
  },
  
  Slider: {
    name: "Slider",
    variants: colorVariants,
    sizes: sizeOptions.small,
    commonProps: ["showValue", "disabled"],
    description: "Range sliders for numeric input",
    category: "data"
  },
  
  AudioSlider: {
    name: "AudioSlider",
    variants: colorVariants,
    sizes: [],
    commonProps: ["showVolume"],
    description: "Audio timeline controls with play/pause",
    category: "data"
  },
  
  ProgressSlider: {
    name: "ProgressSlider",
    variants: colorVariants,
    sizes: [],
    commonProps: ["showPercentage"],
    description: "Learning progress tracking sliders",
    category: "data"
  },

  // Navigation Components
  Breadcrumb: {
    name: "Breadcrumb",
    variants: colorVariants,
    sizes: sizeOptions.small,
    commonProps: ["showHome", "maxItems"],
    description: "Hierarchical navigation breadcrumbs",
    category: "navigation"
  },
  
  Tabs: {
    name: "Tabs",
    variants: colorVariants,
    sizes: sizeOptions.small,
    commonProps: [],
    description: "Tab navigation for content sections",
    category: "navigation"
  },

  // Specialized Components
  Tooltip: {
    name: "Tooltip",
    variants: colorVariants,
    sizes: sizeOptions.small,
    commonProps: [],
    description: "Contextual help and information tooltips",
    category: "specialized"
  },
  
  Loading: {
    name: "Loading",
    variants: colorVariants,
    sizes: sizeOptions.small,
    commonProps: [],
    description: "Loading spinners and skeleton states",
    category: "specialized"
  },
  
  Alert: {
    name: "Alert",
    variants: colorVariants,
    sizes: [],
    commonProps: ["dismissible", "icon"],
    description: "Status alerts and notifications",
    category: "specialized"
  },

  Avatar: {
    name: "Avatar",
    variants: colorVariants,
    sizes: sizeOptions.small,
    commonProps: ["showStatus", "name"],
    description: "User profile avatars with status indicators",
    category: "core"
  },

  Dialog: {
    name: "Dialog",
    variants: colorVariants,
    sizes: sizeOptions.full,
    commonProps: ["showCloseButton", "destructive"],
    description: "Modal dialogs for forms and confirmations",
    category: "specialized"
  }
};

export function getComponentConfig(componentName: string): ComponentConfig | undefined {
  return componentConfigs[componentName];
}

export function getComponentsByCategory(category: ComponentConfig["category"]): ComponentConfig[] {
  return Object.values(componentConfigs).filter(config => config.category === category);
}

export function getAllComponents(): ComponentConfig[] {
  return Object.values(componentConfigs);
}

// LMS-specific component groupings for educational contexts
export const lmsComponentGroups = {
  "User Management": ["Table", "DataTable", "Button", "Badge", "Dialog"],
  "Content Creation": ["Input", "Textarea", "RichTextEditor", "Card", "Tabs"],
  "Audio Learning": ["AudioSlider", "ProgressSlider", "Progress", "Button"],
  "Navigation": ["Breadcrumb", "Tabs", "Button", "Card"],
  "Student Interface": ["Progress", "ProgressSlider", "Card", "Badge", "Alert"],
  "Administration": ["Table", "DataTable", "Dialog", "Switch", "Checkbox"]
};

export function getLMSComponentGroup(groupName: keyof typeof lmsComponentGroups): ComponentConfig[] {
  const componentNames = lmsComponentGroups[groupName] || [];
  return componentNames.map(name => componentConfigs[name]).filter(Boolean);
}