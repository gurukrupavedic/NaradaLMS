---
trigger: always_on
---

Context
You are operating inside the VedicLMS workspace: a modern, multilingual learning platform purpose-built for Vedic / pathasala education. This is NOT a generic LMS. Do not collapse VedicLMS into generic “course / lesson / quiz” terminology; preserve domain language (tracks, batches, chapters, segments, proficiency). Optimize for domain correctness, instructor trust, and long-term clarity over short-term convenience.

Core philosophy
- Trust-first, instructor-led learning (Guru–Śiṣya paramparā).
- Flexibility over rigid enforcement.
- Clear domain invariants over process.
- Modern, refined UX without losing cultural fidelity.

────────────────────────────────
DOMAIN INVARIANTS (NON-NEGOTIABLE)
────────────────────────────────

1. Progress & Evaluation
- Progress is tracked strictly at **Student + Chapter**.
- Progress is NOT batch-scoped and NOT track-scoped.
- Any aggregate progress (batch, track, course) must be derived from Student + Chapter, never stored as a separate source of truth.
- Tracks are curriculum groupings; batches are logistical cohorts.
- Proficiency uses a 0–4 scale.
- Proficiency movement is non-linear and reversible.
- Instructors are the final authority on proficiency.

2. Tracks & Gating
- A batch’s “current track” is informational metadata only.
- Track gating (when enabled):
  - Track N+1 unlocks only if **all chapters in Track N ≥ proficiency 2**.
- The system must not assume gating is always enforced.

3. Content Model
- Content is multilingual with **three first-class scripts**:
  - Telugu
  - Devanagari
  - English (IAST)
- Scripts are authored variants, not runtime transliterations.
- Diacritics and script-specific typography must be preserved.
- Chapters support **dual learning modes**:
  - Reading (rich article view)
  - Interactive segmented text view
- Do not design features that assume only one mode exists.

4. Segmentation & Audio
- Segmentation is intentional and pedagogical, not arbitrary.
- Segments belong to a specific script version.
- Audio ↔ text mapping is segment-based and timestamped.
- Segment-level interaction (click, loop, highlight) is a first-class behavior.

5. Roles & Authority
- Roles are additive: student, instructor, content_manager, admin.
- Approval is manual; login may be blocked until approval.
- Approval auto-assigns the student role.
- Only content_manager/admin can publish content.
- Draft content is invisible to students.
- Published content should not be hard-deleted.
- If removal of published content is necessary, use soft-delete with an audit trail.
- Enforce role and authority checks in server/modules; client logic is advisory only.

6. Batches
- Batches exist for coordination, scheduling, and instructor context.
- Batches do not own progress.
- Students may belong to multiple batches over time.

────────────────────────────────
THINKING & DESIGN GUIDELINES
────────────────────────────────

- Always identify:
  - Persona (student / instructor / content_manager / admin)
  - Primary object (chapter, segment, audio, progress, batch, user)
- Prefer domain correctness over “standard LMS” conventions.
- Avoid premature automation, enforcement, or optimization.
- Preserve flexibility that mirrors real-world pathasala learning.
- When uncertain, choose clarity, reversibility, and auditability.

────────────────────────────────
UI & IMPLEMENTATION DISCIPLINE (shadcn/ui)
────────────────────────────────

- UI stack: React + Tailwind + shadcn/ui (Radix-based primitives).
- Visual intent: refined, professional, calm, and modern.
- Prefer clarity and restraint over visual noise or novelty.
- Follow established shadcn/ui and Radix patterns before introducing custom components.
- Avoid unnecessary abstractions, over-styling, or clever UX.
- Reuse shared components (e.g., SegmentedTextDisplay, AudioControls) rather than creating variants.
- Maintain consistent spacing, typography, and semantic color usage.
- Accessibility is non-negotiable: keyboard navigation, visible focus states, readable text, and ≥44px touch targets where applicable.
- Code should be readable and conventional; optimize for maintainability over micro-optimizations.

────────────────────────────────
ENGINEERING GROUNDING
────────────────────────────────

- Frontend components live under client/src.
- Domain logic belongs in server/modules.
- Auth and approval flows are first-class concerns.
- Sensitive actions should be auditable.
- Enforce role and domain invariants in server/modules.
- Do not introduce abstractions that obscure domain meaning.

────────────────────────────────
OUTPUT EXPECTATIONS (WHEN RESPONDING)
────────────────────────────────

- Use structured thinking: invariants, assumptions, tradeoffs.
- Call out ambiguities instead of inventing rules.
- Keep solutions evolvable.
- Optimize for consistency across future features.
