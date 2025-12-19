# Goal 1: Catalog and Remove Unused UI Pages

## Objective
Identify and document all UI pages/components not used in the main workflows (Learning, Manage Content, Batches, Manage Users). Plan and track their removal.

## Steps
1. Inventory all UI pages/components in the codebase.
2. Cross-reference with app routes and navigation.
3. List unused pages/components below.
4. Review and confirm before deletion.
5. Remove and archive this document when complete.

---

## Unused UI Pages/Components (To Review)

| File Path | Type | Notes |
|-----------|------|-------|
|           |      |       |
| client/src/pages/AdminPanelExperiment.tsx | Page | Only used in experiments, not in main workflows |
| client/src/pages/ChapterExperiment.tsx | Page | Experiment/legacy, not routed in main app |
| client/src/pages/ChapterViewExperiment.tsx | Page | Experiment/legacy, not routed in main app |
| client/src/pages/DashboardExperiment.tsx | Page | Experiment/legacy, not routed in main app |
| client/src/pages/DashboardOldExperiment.tsx | Page | Old dashboard, not routed in main app |
| client/src/pages/ExperimentsShowcase.tsx | Page | Experiments hub, not in main workflows |
| client/src/pages/InstructorPanelExperiment.tsx | Page | Experiment/legacy, not routed in main app |
| client/src/pages/RoleTabsExperiment.tsx | Page | Experiment/legacy, not routed in main app |
| client/src/pages/RoleBasedTabsExperiment.tsx | Page | Experiment/legacy, not routed in main app |
| client/src/pages/StudentDashboardExperiment.tsx | Page | Experiment/legacy, not routed in main app |
| client/src/pages/TrackViewExperiment.tsx | Page | Experiment/legacy, not routed in main app |

| client/src/components/AdminPanel.tsx | Component | Only used by AdminPanelExperiment (legacy/experiment) |
| client/src/components/InstructorPanel.tsx | Component | Only used by InstructorPanelExperiment (legacy/experiment) |
| client/src/components/StudentDashboard.tsx | Component | Only used by StudentDashboardExperiment (legacy/experiment) |
| client/src/components/Dashboard.tsx | Component | Only used by DashboardExperiment (legacy/experiment) |
| client/src/components/RoleTabs.tsx | Component | Only used by RoleTabsExperiment (legacy/experiment) |
| client/src/components/SimpleDashboard.tsx | Component | Only used by experiment/legacy pages |
| client/src/components/LanguageSwitcher.tsx | Component | Only used by experiment/legacy pages |

| client/src/components/InteractiveSegments.tsx | Component | Not imported or used anywhere (true dead code) |
| client/src/components/InteractiveSegment.tsx | Component | Only imported in ChapterExperiment (experiment/legacy page) |

---

## Decisions & Actions

- [x] **DesignSystemExperiment.tsx moved to client/src/design-system/** - Kept as a valuable tool for visualizing and testing all design system components.
- [ ] Review and delete remaining experiment pages and their dependent components.
- [ ] Archive this document after all deletions are complete.
