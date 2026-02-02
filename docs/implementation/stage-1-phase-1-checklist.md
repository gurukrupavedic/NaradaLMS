# Student Portal Implementation Tasks

- [ ] **Config Setup**
  - [ ] `postcss.config.mjs`: point to tailwind config
  - [ ] `tailwind.config.ts`: extend `@narada/tailwind-config`
  - [ ] `tsconfig.json`: extend `@narada/typescript-config/nextjs.json`
  - [ ] `eslintrc.json`: extend `@narada/eslint-config`
- [ ] **Dependencies**
  - [ ] Add `@narada/ui` to package.json
  - [ ] Add `lucide-react`, `clsx`, `tailwind-merge`
- [ ] **Generic UI Extraction**
  - [ ] Copy `Button`, `Input`, `Card`, `Label` to `packages/ui`
  - [ ] Export them from `packages/ui/src/components/index.ts`
- [ ] **Tiptap Adapter**
  - [ ] Create `packages/ui/src/editor/TiptapProvider.tsx`
  - [ ] Move editor components
- [ ] **Data Fetching**
  - [ ] Create `apps/student-portal/src/lib/api.ts` (Proxy to :5000)
