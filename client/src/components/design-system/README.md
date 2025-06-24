# Vedic LMS Design System

## Overview

A modern, colorful design system built specifically for the Vedic Learning Management System. Features vibrant colors, educational semantics, and consistent interaction patterns.

## Core Principles

1. **Vibrant & Engaging**: 12 colorful variants that bring energy to educational interfaces
2. **Educational Context**: Semantic variants designed for learning workflows
3. **Consistent Interactions**: Unified hover states, glow effects, and transitions
4. **Multi-language Support**: Typography optimized for Telugu, Hindi, and English content

## Components

### Card Component
- **Variants**: 12 color variants + educational semantics (lesson, progress, content, etc.)
- **Features**: Interactive hover states, glow effects, consistent styling
- **Usage**: Feature tiles, content cards, progress indicators

### Button Component
- **Variants**: 
  - Solid colors (12 variants)
  - Outline colors (12 variants) 
  - Educational actions (save, edit, delete, etc.)
- **Features**: Colorful hover states, subtle glow effects, size variants
- **Usage**: Primary actions, navigation, educational workflows

### Input Component
- **Variants**: 12 focus color variants + educational types
- **Features**: Colorful focus rings, consistent styling
- **Usage**: Forms, search, content creation

## Color Palette

- **Blue** (#3b82f6): Learning, lessons, information
- **Green** (#22c55e): Success, completion, content creation
- **Purple** (#a855f7): Progress, previews, experiments
- **Orange** (#f97316): Audio content, media
- **Pink** (#ec4899): Assessments, evaluations
- **Indigo** (#6366f1): Navigation, features
- **Teal** (#14b8a6): Text content, descriptions
- **Cyan** (#06b6d4): Communication, home
- **Yellow** (#eab308): Warnings, highlights
- **Lime** (#84cc16): Growth, achievements
- **Rose** (#f43f5e): Errors, deletion
- **Emerald** (#10b981): Publishing, tracks

## Integration

Replace existing shadcn/ui components with design system components:

```tsx
// Before
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// After  
import { Card } from "@/components/design-system/Card";
import { Button } from "@/components/design-system/Button";

// Usage
<Card variant="blue" interactive glow="subtle">
  <CardContent>
    <Button educational="lesson">Start Learning</Button>
  </CardContent>
</Card>
```

## Educational Semantics

### Card Variants
- `lesson`: Blue - Learning content
- `progress`: Purple - Progress tracking
- `content`: Green - Content management
- `audio`: Orange - Audio materials
- `assessment`: Rose - Tests and evaluations
- `track`: Emerald - Learning tracks

### Button Actions
- `save`: Green - Save content
- `edit`: Blue - Edit functionality  
- `delete`: Rose - Delete actions
- `publish`: Emerald - Publishing content
- `preview`: Purple - Preview content
- `audio`: Orange - Audio controls

## Future Components

Planned components for complete LMS coverage:
- Tabs (navigation)
- Progress indicators (learning progress)
- Avatar (user profiles)
- Badge (achievements, status)
- Alert (notifications)
- Table (data display)
- Navigation (breadcrumbs, menus)

## Design Tokens

All components use systematic design tokens:
- Spacing: 4px grid system
- Colors: 12 vibrant variants
- Typography: Multi-language support
- Shadows: Consistent elevation system
- Border radius: Systematic rounding values