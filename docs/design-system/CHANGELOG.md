# Gayatri Design System: Changelog

## [Phase 5] - Refinement: Luminous Hema
- **Adjusted**: Shifted Hema (Gold) Hue from `70` to `85`.
- **Improved**: Lifted Lightness and reduced Chroma to move from "Amber Action" to "Golden Illumination."
- **Verified**: Dark mode focus rings now read as "luminous" rather than "heavy."

## [Phase 4] - Hardening: Canonicalization
- **Refactored**: Moved all tokens from `index.css` to `client/src/styles/design-system/tokens.css`.
- **Guardrail**: Added `scripts/check-theme-integrity.js` to prevent token fragmentation.
- **Deleted**: Removed unused legacy `components.css`.

## [Phase 3] - Feedback & Remediation
- **Fixed**: Removed critical legacy HSL overrides in `index.css` that were breaking dark mode backgrounds.
- **Normalized**: Applied `bg-background` to the main `AppLayout` canvas.
- **Established**: Mapped `Vidruma` (Coral) to error and destructive states.

## [Phase 2] - Actions & Focus
- **Mapped**: `Hema` (Gold) became the `--primary` action token.
- **Accessibility**: Standardized `nila-text` on gold surfaces for AA contrast.
- **Interaction**: Enforced global focus visible rings in Hema.

## [Phase 1] - Shell & Surfaces
- **Initial Setup**: Defined the Gayatri OKLCH primitives in `tailwind.config.ts`.
- **Execution**: Applied `Nila` to the Sidebar and `Mukta` to the main canvas.
- **Identity**: Established the foundation of the "Sacred & Professional" theme.
