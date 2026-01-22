# The Gayatri Approach: Design System Blueprint

This document outlines the reusable methodology used to build the Gayatri Design System. It serves as a blueprint for migrating legacy UIs to concept-driven, tokenized design systems.

## 🗺️ Mental Model to System Mapping

The journey follows a strict hierarchy of abstraction:

### 1. The Core Concept (Ideation)
Identify the "Spirit" of the application before choosing colors.
- **NaradaLMS**: "Guru-Shishya Parampara" → Stability (Nīla) + Illumination (Hema).

### 2. Primitive Primitives (The Palette)
Define colors as raw values (OKLCH). Don't assign meaning yet.
- **OKLCH vs HSL**: Always use OKLCH for consistent perceptual lightness across different hues.

### 3. Semantic Mapping (The Strategy)
Map Primitives to Roles (`Background`, `Primary`, `Muted`). 
- **Rule of One**: Exactly one primary action per view (Hema). 
- **Structure Over Surface**: Structural elements (Sidebar/Header) use a different depth (Nīla) than the active canvas (Mukta).

## 🚀 The 5-Phase Implementation Journey

Use this phased rollout for zero-downtime, safe migrations:

### Phase 1: Shell & Surfaces (The Canvas)
Paint the background and the sidebar first. This gives the application its immediate "new identity."

### Phase 2: Actions & Focus (The Interaction)
Shift primary buttons and focus rings. This creates the "interactive glow" that guides users.

### Phase 3: Remediation (The Audit)
Identify "Pure Black" or "Pure White" fallbacks. Hunt down legacy CSS files that override your new tokens. 
> [!TIP]
> Use a "Visual Coherence Audit" to find elements that don't inherit the global background correctly.

### Phase 4: Hardening (The Lockdown)
Move all variables into a leaf file (`tokens.css`). Implement a **Guardrail Script** to fail the build if developers bypass the token system.

### Phase 5: Refinement (The Polish)
Micro-adjust Hue and Lightness based on "feel." In Gayatri, we moved Hema from 70 (Amber) to 85 (Yellow) to achieve "illumination" rather than "pigment."

## 📏 Guardrail Philosophy

**Don't trust, verify.**
A design system is only as good as its enforcement. If developers can define `--my-blue: #0000ff;` in a local file, the system is fragmented. 
- Use scripts to search for hardcoded hex codes or HSL values.
- Enforce a "Semantic-Only" rule for component styling.
