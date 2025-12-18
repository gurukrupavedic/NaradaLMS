# TODO - Frontend

## Overview
Frontend tasks organized by component area, criticality, and risk. 

---

## Active Backlog

### CLEANUP & REFACTORING

**1. Extract shared design system utilities and centralize token management**
   - **Type:** Refactoring / Code Quality
   - **Criticality:** Low (code organization only)
   - **Risk:** Low (isolated to utilities)
   - **Estimated effort:** 2-3 hours
   - **Dependencies:** None
   - **Current State:** Design system tokens scattered across Tailwind config and component files.
   - **What needs fixing:** Consolidate color, spacing, and animation tokens into `lib/design-tokens.ts`.
   - **Why it matters:** Easier theming, consistent design updates, reduced duplication.
   - **Priority:** Low (nice-to-have)

**2. Clean up unused imports and dead code in component files**
   - **Type:** Cleanup
   - **Criticality:** Low
   - **Risk:** Low (routine cleanup; LSP helps identify dead code)
   - **Estimated effort:** 2-3 hours
   - **Dependencies:** None
   - **Current State:** Some components may have unused imports from development/refactoring.
   - **What needs fixing:** Run LSP diagnostics, remove unused imports and unreachable code.
   - **Why it matters:** Cleaner codebase, smaller bundle.
   - **Priority:** Low (can be batched with other cleanup)

---

### ENHANCEMENTS & FEATURES

**3. Add loading states and skeleton screens for async data**
   - **Type:** Enhancement / UX
   - **Criticality:** Medium (improves perceived performance)
   - **Risk:** Low (isolated to component state)
   - **Estimated effort:** 2-4 hours
   - **Dependencies:** TanStack Query integration (already in place)
   - **Current State:** Some routes/components show blank screens while loading.
   - **What needs fixing:** Add `isLoading` states with skeleton loaders in list views, editors, and learn mode.
   - **Why it matters:** Better user experience; less perceived lag.
   - **Priority:** Medium (improve UX for instructors)

**4. Improve form validation UX (inline errors, focus management)**
   - **Type:** Enhancement / UX
   - **Criticality:** Medium (impacts editing experience)
   - **Risk:** Low (isolated to form components)
   - **Estimated effort:** 2-3 hours
   - **Dependencies:** React Hook Form (already in use)
   - **Current State:** Forms show validation errors but could provide better feedback.
   - **What needs fixing:** (a) Show inline error messages under fields; (b) Auto-focus first error; (c) Disable submit while errors present.
   - **Why it matters:** Better instructor experience during content creation.
   - **Priority:** Medium (improve editing workflow)

**5. Add keyboard shortcuts for editor actions**
   - **Type:** Enhancement / Accessibility
   - **Criticality:** Low (productivity improvement)
   - **Risk:** Low (isolated to editor; no conflicts with browser shortcuts)
   - **Estimated effort:** 2-3 hours
   - **Dependencies:** None
   - **Current State:** All actions require mouse clicks.
   - **What needs fixing:** Add shortcuts: Ctrl+S (save), Ctrl+B (bold), etc. in rich text editor.
   - **Why it matters:** Faster editing for power users; better accessibility.
   - **Priority:** Low (nice-to-have; defer if time-constrained)

**6. Implement dark mode support**
   - **Type:** Enhancement / Feature
   - **Criticality:** Low
   - **Risk:** Low (Tailwind supports dark mode; isolated CSS changes)
   - **Estimated effort:** 3-4 hours
   - **Dependencies:** Tailwind CSS dark mode
   - **Current State:** Light mode only.
   - **What needs fixing:** Add `prefers-color-scheme` detection; toggle dark mode in settings; persist preference to localStorage.
   - **Why it matters:** Better accessibility; user preference.
   - **Priority:** Low (defer until requested)

**7. Add breadcrumb navigation to nested pages**
   - **Type:** Enhancement / UX
   - **Criticality:** Low (navigation clarity)
   - **Risk:** Low (isolated to navigation)
   - **Estimated effort:** 1-2 hours
   - **Dependencies:** Wouter routing (already in place)
   - **Current State:** Users must use back button to navigate up; breadcrumbs missing in nested routes.
   - **What needs fixing:** Add breadcrumb component to manage/learn hierarchy pages.
   - **Why it matters:** Better wayfinding; clearer navigation hierarchy.
   - **Priority:** Low (nice-to-have UX improvement)

---

## Known Issues & Observations

- Dashboard experiments are preserved; refer to `docs/TODO/TODO-frontend-cleanup.md` (Topic 2 section) for final cleanup checklist when real auth/role features are ready.
- RichTextEditor (TipTap) works well; no known issues.
- Progressive mapper and text segmentation are stable.
- SimpleDashboard (production) is active and unaffected by cleanup.

---

## Future Considerations

- Consider adding responsive grid layout for admin tables.
- Explore accessibility improvements (ARIA labels, keyboard navigation).
- Evaluate component library updates (shadcn/ui, Radix UI).

---

## Notes
- Most frontend tasks are enhancements; priority items are dashboard cleanup (when auth is finalized) and UX improvements (loading states, form validation).
- Keep experiments isolated under `/experiments` until decision to integrate or remove.

---

## Completed Items

- ✅ Experimental showcase pages removed (Topic 1)
- ✅ Dashboard components preserved under `/experiments` (Topic 2)
- ✅ Hidden Media Segmentation panel removed (Topic 3)
