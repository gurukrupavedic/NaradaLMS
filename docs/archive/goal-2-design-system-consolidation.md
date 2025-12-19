# Goal 2: Design System Consolidation

## Objective
Inventory, consolidate, and standardize all design system/component files. Clarify what is used in the app, what is prototype/legacy, and plan a unified, modern design system.

## Steps
1. Inventory all design system/component files (React, CSS, tokens, etc.).
2. Identify which are used in the app and which are not.
3. Propose a consolidation plan (move, merge, remove, document gaps).
4. Track progress and decisions here.
5. Archive this document after implementation.

---

## Design System Inventory

| File/Component         | Location                                   | Used in App?      | Notes |
|------------------------|--------------------------------------------|-------------------|-------|
| Tooltip                | design-system/Tooltip.tsx                  | showcase-only     | Only used in DesignSystemShowcase |
| TextSegment            | design-system/TextSegment.tsx              | showcase-only     | Only used in DesignSystemShowcase |
| Tabs                   | design-system/Tabs.tsx                     | showcase-only     | Only used in DesignSystemShowcase |
| Switch                 | design-system/Switch.tsx                   | used              | Used in EditChapter |
| Slider                 | design-system/Slider.tsx                   | showcase-only     | Only used in DesignSystemShowcase |
| Select                 | design-system/Select.tsx                   | showcase-only     | Only used in DesignSystemShowcase |
| RichTextEditor         | design-system/RichTextEditor.tsx            | used              | Used in EditChapter, ContentTab |
| Radio                  | design-system/Radio.tsx                    | showcase-only     | Only used in DesignSystemShowcase |
| Progress               | design-system/Progress.tsx                 | showcase-only     | Only used in DesignSystemShowcase |
| MappingSegmentCard     | design-system/MappingSegmentCard.tsx       | showcase-only     | Only used in DesignSystemShowcase |
| Loading                | design-system/Loading.tsx                  | showcase-only     | Only used in DesignSystemShowcase |
| Input                  | design-system/Input.tsx                    | used              | Used in EditChapter, Login, Register |
| Dialog                 | design-system/Dialog.tsx                   | showcase-only     | Only used in DesignSystemShowcase |
| DesignSystemShowcase   | design-system/DesignSystemShowcase.tsx     | showcase-only     | Design system demo only |
| ComponentInspector     | design-system/ComponentInspector.tsx       | showcase-only     | Design system demo only |
| Checkbox               | design-system/Checkbox.tsx                 | showcase-only     | Only used in DesignSystemShowcase |
| Card                   | design-system/Card.tsx                     | used              | Used in ManageChapters, TrackViewExperiment |
| Button                 | design-system/Button.tsx                   | used              | Used in EditChapter, ChapterExperiment |
| Breadcrumb             | design-system/Breadcrumb.tsx               | showcase-only     | Only used in DesignSystemShowcase |
| Badge                  | design-system/Badge.tsx                    | used              | Used in EditChapter |
| Avatar                 | design-system/Avatar.tsx                   | showcase-only     | Only used in DesignSystemShowcase |
| AudioControls          | design-system/AudioControls.tsx             | used              | Used in EditChapter, StudyChapter |
| Alert                  | design-system/Alert.tsx                    | showcase-only     | Only used in DesignSystemShowcase |

---

## Consolidation Plan & Actions

### 1. Remove Showcase-Only/Unused Components
- Tooltip, TextSegment, Tabs, Slider, Select, Radio, Progress, MappingSegmentCard, Loading, Dialog, DesignSystemShowcase, ComponentInspector, Checkbox, Breadcrumb, Avatar, Alert
	- Action: Remove these files after confirming no hidden usage. They are only used in the design system showcase/demo.

### 2. Retain and Standardize Core Components
- Switch, RichTextEditor, Input, Card, Button, Badge, AudioControls
	- Action: These are actively used in the app. Review for consistency, update props/variants as needed, and document usage.

### 3. Merge or Refactor if Needed
- If any of the above have duplicate logic with shadcn/ui or other UI folders, merge into a single canonical version.

### 4. Document Gaps or Needs
- If any missing primitives or patterns are identified during review, add to this doc for future implementation.

### 5. Archive
- After cleanup and refactor, archive this doc and move removed files to an archive folder if needed for reference.

---

## Completed Actions

- [x] **Moved design system files to client/src/design-system/** (Dec 18, 2025)
  - Created client/src/design-system/ directory
  - Moved DesignSystemExperiment.tsx from client/src/pages/ to client/src/design-system/
  - Moved dark-theme-showcase.html and light-theme-showcase.html from experiments/design-systems/ to client/src/design-system/
  - Deleted experiments/ folder from project root
  - All design system demo/showcase files now consolidated under client/src/design-system/

- [x] **Completed design system inventory** (Dec 18, 2025)
  - Cataloged all 24 design system components
  - Cross-referenced usage across the entire codebase
  - Identified 16 showcase-only components and 8 actively used components
  - Documented findings in inventory table above
