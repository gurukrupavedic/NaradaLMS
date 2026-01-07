# Content Studio Prototype Architecture & Integration Guide

**Version:** 1.0
**Date:** 2026-01-06
**Status:** Refined Prototype
**Location:** `client/src/temp-prototype/content-studio-refine/`

## 1. Overview
This document details the architecture of the refined "Content Studio" prototype ("Tracks & Chapters" manager).

**Integration Targets:**
*   **Main Page**: The prototype logic will be ported to `client/src/new-ui/content/pages/TracksAndChaptersPage.tsx`.
*   **Chapter Editor**: The "Open" button on a chapter card will navigate to `client/src/new-ui/content/pages/ChapterContentPage.tsx`.

The prototype is built as a **Single Page Component** that handles all CRUD operations, drag-and-drop reordering, and UI state locally.

## 2. Component Structure

The feature is contained entirely within the `content-studio-refine` directory.

### Core Components
1.  **`TracksAndChaptersRefined.tsx` (Container)**
    -   **Role:** Single Source of Truth. Manages all application state (`tracks`, `selectedTrack`, `dialogs`).
    -   **Responsibility:**
        -   Holds the master `tracks` array (currently initialized with mock data).
        -   Handles all logic: CRUD, Drag-and-Drop (`handleDragEnd`), Moving items.
        -   Manages persisting UI preferences (column sizes, selection) to `localStorage`.
        -   Renders the `ResizablePanelGroup` layout.
    -   **Backend Touchpoints:** This is where **ALL** API calls will eventually live.

2.  **`SortableTrackItem.tsx`**
    -   **Role:** Presentation & Drag Handler for a single Track card.
    -   **Responsibility:**
        -   Displays track metadata (Order #, Title, Chapter Count).
        -   Handles "Selected" visual state (Blue border, grey background).
        -   Uses `@dnd-kit/sortable` hooks for drag interactions.
        -   Triggers parent handlers (`onSelect`, `onEdit`, `onDelete`).

3.  **`SortableChapterItem.tsx`**
    -   **Role:** Presentation & Drag Handler for a single Chapter card.
    -   **Responsibility:**
        -   Displays chapter metadata (Status Badge, Title).
        -   Provides actions: Edit, Move, Delete, Open.
        -   Uses `@dnd-kit/sortable` hooks.

## 3. Technology Stack & Dependencies

*   **Drag & Drop:** `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`
    *   Used for the vertical sorting lists in both columns.
*   **UI Library:** `shadcn/ui` (built on Radix UI)
    *   `Card`, `Button`, `Dialog`, `ScrollArea`, `ResizablePanel`, `Badge`, `Input`, `Select`, `AlertDialog`.
*   **Icons:** `lucide-react`
*   **Persistence:** Custom `useLocalStorage` hook (internal to `TracksAndChaptersRefined.tsx`).

## 4. Functionality Breakdwon

| Feature | Implementation | Notes |
| :--- | :--- | :--- |
| **Two-Column Layout** | `ResizablePanelGroup` | Persists width ratio to `localStorage`. |
| **Track List** | `@dnd-kit` Sortable Context | Supports vertical reordering. |
| **Chapter List** | `@dnd-kit` Sortable Context | Context updates dynamically when a Track is selected. |
| **Drag & Drop** | `closestCenter` collision | Dropping triggers `arrayMove` on local state. |
| **Selection** | State: `selectedTrackId` | Persisted to `localStorage`. |
| **Moving Chapters** | Custom Dialog Logic | Moves an object from one parent ID array to another. |
| **Scrollbars** | `ScrollArea type="hover"` | Auto-hides for clean UI. |

## 5. Backend Integration Guide (Wiring to Real Data)

When porting to `client/src/new-ui/content/`, you will replace the local state operations in `TracksAndChaptersRefined.tsx` with API mutations (likely using `react-query`).

### A. Data Fetching (Query)
Currently:
```typescript
const [tracks, setTracks] = useState<MockTrack[]>(MOCK_TRACKS);
```
**Future Implementation:**
Replace with a hook like `useQuery(['tracks'], fetchTracks)`.
*   **Endpoint:** `GET /api/tracks?include=chapters`
*   **Structure:** Ensure the API returns the nested structure or normalized data that you reconstruct.

### B. CRUD Operations (Mutations)

Locate these handler functions in `TracksAndChaptersRefined.tsx` and replace logic with API calls.

1.  **Create Track**
    *   **Function:** `handleCreateTrack`
    *   **Current:** Appends to local array with `maxId + 1`.
    *   **Future:** `POST /api/tracks`. On success, invalidate query.

2.  **Update Track**
    *   **Function:** `handleEditTrack`
    *   **Current:** Maps array and replaces item.
    *   **Future:** `PUT` or `PATCH /api/tracks/:id`.

3.  **Delete Track**
    *   **Function:** `handleDeleteTrack`
    *   **Current:** Filters array.
    *   **Future:** `DELETE /api/tracks/:id`. *Note: Handle cascading delete warnings in UI.*

4.  **Create Chapter**
    *   **Function:** `handleCreateChapter`
    *   **Inputs:** `selectedTrackId`, `formData`.
    *   **Future:** `POST /api/tracks/:trackId/chapters`.

5.  **Reorder Tracks (Drag & Drop)**
    *   **Function:** `handleDragEndTrack`
    *   **Current:** `arrayMove` reorders local array.
    *   **Future:**
        1.  **Optimistic UI:** Perform `arrayMove` locally immediately.
        2.  **API:** `PUT /api/tracks/reorder` (send array of IDs in new order).

6.  **Reorder Chapters**
    *   **Function:** `handleDragEndChapter`
    *   **Future:** `PUT /api/tracks/:trackId/chapters/reorder`.

7.  **Move Chapter (Change Track)**
    *   **Function:** `handleMoveChapter`
    *   **Current:** Removes from old track array, adds to new track array.
    *   **Future:** `PUT /api/chapters/:id/move { targetTrackId: ... }`.

8.  **Open Chapter (Navigation)**
    *   **Function:** `onOpen` handler in `TracksAndChaptersRefined.tsx`.
    *   **Current:** `alert(...)`.
    *   **Future:** Navigate to the editor page using your router (e.g., `router.push`).
        ```typescript
        // Target Route:
        router.push(\`/content-studio/tracks/\${trackId}/chapters/\${chapterId}\`);
        // Maps to: client/src/new-ui/content/pages/ChapterContentPage.tsx
        ```

### C. Wiring Checklist
- [ ] Replace `MOCK_TRACKS` import with API hook.
- [ ] Ensure `selectedTrackId` handles cases where the selected track might be deleted by another user (check existence after fetch).
- [ ] Wire `onDragEnd` to an API endpoint that accepts batch order updates.
- [ ] Keep `useLocalStorage` for UI preferences (Column width, Selection) - this **should not** go to the backend (it's user-device specific).

