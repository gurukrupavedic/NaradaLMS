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

## 🔑 Semantic Token Usage Guide

Use this table to choose the right token. **Never hardcode values.**

| Token | Meaning | Correct Usage | Anti-Usage (Don't Do This) |
| :--- | :--- | :--- | :--- |
| `primary` | "Do this now" | Main CTA button, active tab indicator. | Backgrounds, text highlights, decorative borders. |
| `destructive` | "Danger/Attention" | Delete button, Error Alert. | "Cancel" buttons (use `secondary/ghost`), generic icons. |
| `muted` | "Background info" | Metadata text, secondary borders. | Disabled buttons (use `opacity`), main body text. |
| `background` | "The Canvas" | Page root, main container. | Card backgrounds (use `card`), modal overlays. |
| `surface` | "Elevated Area" | Cards, Modals, Popovers. | Main page background. |
| `ring` | "Focus" | Focus indicators, selection outlines. | Decorative borders (use `border`). |

## 🏗️ Technical Implementation

The theme is implemented using CSS Variables defined in OKLCH, mapped through Tailwind CSS.

### 1. Token Definitions (`tokens.css`)
Located at [tokens.css](file:///client/src/styles/design-system/tokens.css).
This is the **Single Source of Truth**. All color primitives and semantic mappings (Light/Dark) are defined here.

### 2. Global Integration (`index.css`)
Located at [index.css](file:///client/src/index.css).
No tokens are defined here. This file imports the tokens and applies global resets and utility layers.

### 3. Tailwind Mapping (`tailwind.config.ts`)
The configuration maps semantic CSS variables back to Tailwind classes.

## 📈 How to Add or Evolve a Semantic Token

The design system is "Locked" but not "Dead." Follow this process to change it:

1.  **Justify the Need**:
    - Does an existing token work? (e.g., using `destructive` for a "Warning"?)
    - Is this a one-off (use strict style) or a pattern (needs a token)?

2.  **Define Location**:
    - **MUST** be defined in `tokens.css`.
    - **MUST** have both `:root` (Light) and `.dark` (Dark) values.

3.  **Update Config**:
    - If it's a new _role_ (e.g., `brand-tertiary`), update `tailwind.config.ts`.

4.  **Verify Integrity**:
    - Run `node scripts/check-theme-integrity.js` to ensure you didn't accidentally touch `index.css`.

> **Rule of Thumb**: If you are editing `index.css` to change a color, **STOP**. You are breaking the system. Go to `tokens.css`.

## 🛡️ Guardrails

To prevent the common "Legacy Override" bug (where multiple theme definitions conflict), we use an automated integrity check:

- **Script**: [check-theme-integrity.js](file:///scripts/check-theme-integrity.js)
- **Logic**: Fails the build if `index.css` contains any direct token definitions.

## ♿ Accessibility

- **Contrast**: `hema-base` (Gold) is paired with `nila-text` (Deep Navy) for primary actions to ensure WCAG AA compliance.
- **Focus**: Global focus rings use `ring-ring` (Hema) with a background offset for visibility.
