# Gayatri Design System

The Gayatri Design System is the visual foundation of NaradaLMS, designed to evoke a "Sacred & Professional" aesthetic through Vedic color theory and modern OKLCH color spaces.

## 🎨 The Palette

The system is built on four core primitives:

| Name | Role | Essence |
|------|------|---------|
| **Mukta (Pearl)** | Canvas | Purity, clarity, and focus. |
| **Nīla (Sapphire)** | Structure | Stability, depth, and intelligence. |
| **Hema (Gold)** | Illumination | Action, primary focus, and enlightenment. |
| **Vidruma (Coral)** | Vitality | Warning, urgency, and critical feedback. |

## 🏗️ Technical Implementation

The theme is implemented using CSS Variables defined in OKLCH, mapped through Tailwind CSS.

### 1. Token Definitions (`tokens.css`)
Located at [tokens.css](file:///client/src/styles/design-system/tokens.css).
This is the **Single Source of Truth**. All color primitives and semantic mappings (Light/Dark) are defined here.

```css
:root {
  --mukta-canvas: 0.985 0.005 90;
  --nila-base: 0.20 0.06 265;
  --hema-base: 0.76 0.13 85; /* Luminous Yellow-Gold */
  ...
  --background: oklch(var(--mukta-canvas));
}
```

### 2. Global Integration (`index.css`)
Located at [index.css](file:///client/src/index.css).
No tokens are defined here. This file imports the tokens and applies global resets and utility layers.

```css
@import './styles/design-system/tokens.css';

@layer base {
  body {
    @apply bg-background text-foreground;
  }
}
```

### 3. Tailwind Mapping (`tailwind.config.ts`)
The configuration maps semantic CSS variables back to Tailwind classes:

```typescript
// tailwind.config.ts
colors: {
  background: "var(--background)",
  primary: {
    DEFAULT: "var(--primary)",
    foreground: "var(--primary-foreground)",
  },
  ...
}
```

## 🛡️ Guardrails

To prevent the common "Legacy Override" bug (where multiple theme definitions conflict), we use an automated integrity check:

- **Script**: [check-theme-integrity.js](file:///scripts/check-theme-integrity.js)
- **Logic**: Fails the build if `index.css` contains any direct token definitions (like `:root` or custom `--` variables). All new tokens must go to `tokens.css`.

## ♿ Accessibility

- **Contrast**: `hema-base` (Gold) is paired with `nila-text` (Deep Navy) for primary actions to ensure WCAG AA compliance.
- **Focus**: Global focus rings use `ring-ring` (Hema) with an offset of `bg-background` for maximum visibility across all surfaces.
