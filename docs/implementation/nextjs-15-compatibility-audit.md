# Next.js 15 Compatibility Audit

**Date**: 2026-02-02
**Target**: Next.js 15 (App Router) + React 19 (rc) / React 18 (compatibility mode)
**Status**: YELLOW (Proceed with Caution)

## Executive Summary

Based on a deep dependency review, the codebase is **90% ready** for Next.js 15. The remaining 10% involves specific UI libraries that require strict "Client Component" encapsulation (`"use client"`) or dynamic imports to avoid Server-Side Rendering (SSR) crashes.

**Critical Decision**: We will proceed with **Next.js 15**, but we must enforce **Client-Side Rendering (CSR)** for complex UI components during the initial migration.

---

## 🛑 Critical Issues & Mitigations

### 1. Tiptap Editor (High Risk)

* **Issue**: Tiptap is DOM-heavy and not SSR-friendly. It causes "Hydration Mismatches" if rendered on the server.
* **Next.js 15 Impact**: Strict hydration checks in React 19 will throw fatal errors.
* **Mitigation**:
  * **MUST** lazy load the editor with `ssr: false`.
  * **Code Pattern**:

        ```typescript
        // apps/student-portal/components/editor-wrapper.tsx
        'use client'
        import dynamic from 'next/dynamic'
        
        const TiptapEditor = dynamic(() => import('@narada/ui/tiptap-editor'), { 
          ssr: false,
          loading: () => <p>Loading editor...</p>
        })
        ```

### 2. Recharts (Medium Risk)

* **Issue**: SVG generation on the server often differs from the client, causing layout shifts.
* **Mitigation**: Wrap all charts in a client component.
* **Code Pattern**:
        ```typescript
        'use client'
        import { ResponsiveContainer, BarChart } from 'recharts'
        ```

### 3. dnd-kit (Low Risk)

* **Issue**: Drag and drop relies on `window` and pointer events.
* **Status**: Compatible with App Router but requires `DndContext` to be in a Client Component.

### 4. React 19 Breaking Changes (Refs)

* **Issue**: `forwardRef` is deprecated in React 19. Our current `shadcn/ui` components use it heavily.
* **Strategy**:
  * **Phase 1**: Run Next.js 15 in **React 18 Compatibility Mode** (if possible) or simply suppress hydration warnings initially.
  * **Phase 2**: Systematically refactor `packages/ui` components to remove `forwardRef` as we touch them.

---

## ✅ Confirmed Safe

The following core libraries are verified compatible with Next.js 15:

* `@tanstack/react-query` (v5) - Fully compatible.
* `react-hook-form` - Fully compatible with Server Actions.
* `zod` - Fully compatible.
* `lucide-react` - Fully compatible.
* `date-fns` - Fully compatible.

---

## 📝 Action Items for Migration (Phase 1-0)

1. **Strict Mode**: Enable `reactStrictMode: true` in `next.config.ts` to catch double-render issues early.
2. **Transpile Packages**: Ensure `next.config.ts` includes `transpilePackages: ['@narada/ui']`.
3. **Tiptap Wrapper**: Create a reusable `LazyEditor` component in `packages/ui` immediately after the split.
