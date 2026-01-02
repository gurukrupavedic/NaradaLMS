# Unified Batch Matrix - UI Implementation Architecture

**Last Updated:** January 2, 2026  
**Component Location:** `client/src/new-ui/batches/components/UnifiedBatchMatrix.tsx`  
**Purpose:** This document explains the UI implementation of the unified batch matrix component for developers seeking to help debug or enhance it.

---

## Overview

The UnifiedBatchMatrix is a React component that displays a student × chapter proficiency matrix. It uses TanStack Table for rendering and implements sticky columns for the student name and actions menu.

**Key Features:**
- Student × Chapter grid showing proficiency levels
- Sticky "Student" column (left) with initials badges and student info
- Sticky "Actions" column (kebab menu for dropping students)
- Color-coded proficiency cells (clickable for evaluation modal)
- Dynamic chapter columns based on selected track
- Loading and empty states

---

## Component Architecture

### High-Level Structure

```
UnifiedBatchMatrix (props-based, no internal fetching)
├─ Props Input (students, chapters, progress, callbacks)
├─ TanStack Table Setup
│  ├─ Column Definition (student, actions, chapters)
│  ├─ Row Data Transform (StudentMatrixRow[])
│  └─ Table Instance
├─ Rendering
│  ├─ Header Row (sticky columns + chapter headers)
│  ├─ Body Rows (student info + proficiency cells)
│  └─ States (loading, empty, error)
└─ Modal Integration (MatrixEvaluationModal)
```

### Props Interface

```typescript
interface UnifiedBatchMatrixProps {
  students: StudentMatrixRow[];           // Array of students with id, firstName, lastName, email, enrollmentId
  chapters: Chapter[];                    // Array of chapters (id, code, title, trackId, order)
  progress: StudentProgress[];            // Array of proficiency records (studentId, chapterId, proficiencyLevel)
  loading?: boolean;                      // Loading state
  error?: string | null;                  // Error message
  onUpdateProficiency: (studentId: string, chapterId: number, level: ProficiencyLevel) => Promise<void>;
  onDropStudent: (enrollmentId: number) => void;
}
```

---

## Column Configuration (TanStack Table)

### Column Setup

The component defines three types of columns:

#### 1. Student Column (Sticky - Left)

```typescript
columnHelper.accessor('id', {
  id: 'student',
  header: 'Student',
  cell: (info) => {
    const student = info.row.original;
    return (
      <div className="pl-4 pr-2 py-2 flex items-center gap-2 min-w-0">
        {/* Student Initials Badge */}
        <div className="...initials badge...">
          {getInitials(student.firstName, student.lastName)}
        </div>
        
        {/* Student Info */}
        <div className="min-w-0">
          <div className="truncate font-medium text-sm">
            {student.firstName} {student.lastName}
          </div>
          <div className="truncate text-xs text-gray-500">{student.email}</div>
        </div>
      </div>
    );
  },
  size: 220,  // Fixed width in pixels
})
```

**Styling Details:**
- `pl-4 pr-2 py-2` - Left padding (16px), right padding (8px), vertical padding (8px)
- Badge: 32px × 32px colored circle with student initials
- Text: Truncated to prevent overflow

#### 2. Actions Column (Sticky - Right of Student)

```typescript
columnHelper.display({
  id: 'actions',
  header: '',
  cell: ({ row }) => {
    const student = row.original;
    return (
      <div className="px-2 py-2 flex items-center justify-center">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleDropStudent(...)}>
              Drop Student
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  },
  size: 44,  // Fixed width in pixels
})
```

#### 3. Chapter Columns (Dynamic, Scrollable)

For each chapter in the filtered chapter list:

```typescript
columnHelper.display({
  id: `chapter-${chapter.id}`,
  header: () => (
    <div className="text-center text-xs font-semibold whitespace-normal">
      <div>{chapter.code}</div>
      <div className="text-[10px]">{chapter.title}</div>
    </div>
  ),
  cell: ({ row }) => {
    const student = row.original;
    const progress = getMatrixCell(student.id, String(chapter.id));
    
    return (
      <button
        onClick={() => handleCellClick(student.id, chapter.id, progress.proficiencyLevel)}
        className={`...color based on proficiency level...`}
      >
        {progress.proficiencyLevel === -1 && 'Abs'}
        {progress.proficiencyLevel === 0 && 'Prac'}
        {progress.proficiencyLevel >= 1 && `L${progress.proficiencyLevel}`}
      </button>
    );
  },
  size: 100,  // Fixed width in pixels
})
```

---

## Sticky Column Implementation

### Table Layout

```html
<table className="w-full border-collapse">
  <thead>
    <tr className="...header styling...">
      <!-- Sticky Student Column Header -->
      <th
        className="...sticky z-20 bg-gray-50 dark:bg-gray-900 text-center..."
        style={{ width: '220px', left: '0px' }}
      >
        STUDENT
      </th>
      
      <!-- Sticky Actions Column Header -->
      <th
        className="...sticky z-20 bg-gray-50 dark:bg-gray-900..."
        style={{ width: '44px', left: '220px' }}
      >
        <!-- empty for actions -->
      </th>
      
      <!-- Dynamic Chapter Headers (non-sticky, scrollable) -->
      <th style={{ width: '100px' }}>CH1</th>
      <th style={{ width: '100px' }}>CH2</th>
      <!-- ... more chapters ... -->
    </tr>
  </thead>
  
  <tbody>
    <tr>
      <!-- Sticky Student Cell -->
      <td
        className="sticky z-20 bg-white dark:bg-gray-950 p-0"
        style={{ width: '220px', left: '0px' }}
      >
        {/* Student content */}
      </td>
      
      <!-- Sticky Actions Cell -->
      <td
        className="sticky z-20 bg-white dark:bg-gray-950 p-0"
        style={{ width: '44px', left: '220px' }}
      >
        {/* Kebab menu */}
      </td>
      
      <!-- Dynamic Chapter Cells -->
      <td className="px-2 py-2 text-center">L2</td>
      <!-- ... more cells ... -->
    </tr>
  </tbody>
</table>
```

### CSS Sticky Properties

```css
/* Sticky positioning */
position: sticky;
z-index: 20;                          /* Ensures sticky cols stay above scrolling content */
background-color: currentBg;          /* Prevents content bleeding through */

/* For Student Column */
left: 0px;

/* For Actions Column */
left: 220px;  /* = Student column width */
```

---

## Data Flow & Cell Rendering

### Getting Cell Data

```typescript
const getMatrixCell = (studentId: string, chapterId: string): MatrixCell => {
  const key = `${studentId}-${chapterId}`;
  const progress = progressMap.get(key);
  
  return {
    studentId,
    chapterId,
    proficiencyLevel: progress?.proficiencyLevel ?? -2,  // -2 = not started
    status: progress?.status ?? 'absent',
    lastEvaluatedAt: progress?.lastEvaluatedAt,
  };
};
```

### Color Mapping

```typescript
const getCellColor = (level: ProficiencyLevel): string => {
  const colorMap = {
    '-1': 'bg-gray-200 text-gray-800',      // Absent
    '0': 'bg-amber-100 border-amber-200',   // Practicing
    '1': 'bg-blue-100 border-blue-200',     // L1
    '2': 'bg-green-100 border-green-200',   // L2
    '3': 'bg-purple-100 border-purple-200', // L3
    '4': 'bg-indigo-100 border-indigo-200', // L4
    '-2': 'bg-gray-50 border-gray-200',     // Not Started
  };
  return colorMap[level] || 'bg-gray-50';
};
```

---

## Current Issue: Gap Between Student & Actions Columns

### Problem Description

**Visual Issue:** When horizontally scrolling the matrix, there's a visible gap between the sticky student column and the sticky actions (kebab menu) column. Content from behind (chapter cells) shows through this gap.

**Root Cause Analysis:**

The positioning logic appears to have a mismatch:

```typescript
// Header positioning
style={{ 
  width: '220px',           // Student column width
  left: isSticky ? (header.id === 'actions' ? '220px' : '0px') : undefined
}}

// Cell positioning  
style={{
  width: '44px',            // Actions column width
  left: isSticky ? (cell.column.id === 'actions' ? '220px' : '0px') : undefined
}}
```

**Possible Causes:**
1. **Width Mismatch** - If the student column's actual rendered width doesn't equal 220px due to padding, borders, or content overflow, the `left: 220px` position for actions will be incorrect
2. **Padding Inclusion** - The `size: 220` may not account for padding (`pl-4 pr-2`)
3. **Z-index Layering** - Both columns have `z-20`, so they're at the same stacking level; if they're not perfectly adjacent, one might appear behind the other
4. **Border/Spacing** - The table's border-collapse or cell spacing might add pixels between columns

### Current Styling

**Student Column Cell:**
```typescript
className="pl-4 pr-2 py-2 flex items-center gap-2 min-w-0"
// Total horizontal: 16px (pl-4) + 8px (pr-2) + content + 8px (gap) = ?
```

**Actions Column Cell:**
```typescript
className="px-2 py-2 flex items-center justify-center"
// Total horizontal: 8px (px-2) + 8px (px-2) = 16px padding
```

### Debugging Steps

To help identify the exact issue:

1. **Inspect Column Widths in Browser DevTools:**
   - Right-click student column → Inspect
   - Check computed width (should be 220px)
   - Check actual rendered width (padding + border + content)
   - Repeat for actions column (should be 44px)

2. **Verify `left` Position Calculations:**
   - Student col: `left: 0px` (should align to table left)
   - Actions col: `left: 220px` (should align immediately after student col)
   - If gap exists, `left` value is too large

3. **Check TanStack Table's Size Configuration:**
   - Student: `size: 220` - Is this before or after padding?
   - Actions: `size: 44` - Is this the full width or just button?

4. **Visual Debugging:**
   - Add temporary `border: 2px solid red` to student column
   - Add temporary `border: 2px solid blue` to actions column
   - This shows exact boundaries of each column

---

## Styling Reference

### Header Row

```typescript
<tr className="border-b-2 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900">
```

### Header Cell (Student)

```typescript
className={`
  text-center                                    // Center text
  text-xs font-semibold text-muted-foreground    // Standard header styling
  uppercase tracking-tight                       // Uppercase with letter spacing
  pl-4 pr-2 py-2 align-middle                    // Padding & vertical alignment
  ${isSticky ? 'sticky z-20 bg-gray-50 dark:bg-gray-900' : ''}
`}
```

### Body Cell (Student)

```typescript
className="pl-4 pr-2 py-2 flex items-center gap-2 min-w-0"
```

### Proficiency Cell

```typescript
className={`
  px-2 py-2 text-center                         // Padding & centering
  rounded border font-medium text-sm            // Styling
  cursor-pointer transition-colors              // Interactivity
  ${getCellColor(proficiencyLevel)}             // Dynamic color based on level
  hover:opacity-80                              // Hover effect
`}
```

---

## Modal Integration

When a proficiency cell is clicked:

```typescript
const handleCellClick = (studentId: string, chapterId: number, currentLevel: ProficiencyLevel) => {
  setSelectedCell({ studentId, chapterId, currentLevel });
  // MatrixEvaluationModal becomes visible
};
```

The modal allows user to select a new proficiency level:
- **Absent** (-1) - Gray
- **Practicing** (0) - Amber
- **L1** (1) - Blue
- **L2** (2) - Green
- **L3** (3) - Purple
- **L4** (4) - Indigo

On selection, calls `onUpdateProficiency(studentId, chapterId, newLevel)`.

---

## Performance Considerations

### Large Dataset Rendering

With 30+ students × 12+ chapters = 360+ cells:

```typescript
// TanStack Table virtualizes rows automatically for performance
// But all chapter columns are still rendered (not virtualized horizontally)
// This is acceptable for ~12 chapters; might need optimization for 20+
```

### Memoization

The component doesn't use React.memo currently. Consider adding if:
- Props don't change but parent re-renders frequently
- Chapter list is large (20+)

```typescript
export const UnifiedBatchMatrix = memo(function UnifiedBatchMatrix(props) { ... })
```

---

## File Dependencies

```
UnifiedBatchMatrix.tsx
├─ Types (from types/matrix.ts)
│  ├─ StudentMatrixRow
│  ├─ Chapter
│  ├─ StudentProgress
│  ├─ ProficiencyLevel
│  └─ UnifiedBatchMatrixProps
├─ Components
│  ├─ MatrixEvaluationModal (sibling component)
│  ├─ Button (shadcn/ui)
│  ├─ DropdownMenu (shadcn/ui)
│  └─ Icons (lucide-react)
├─ Utilities (matrix-utils.ts)
│  ├─ getCellColor()
│  ├─ getProficiencyShortLabel()
│  └─ Color/label mappings
└─ Table Library
   └─ @tanstack/react-table (v5)
```

---

## Testing Recommendations

### Manual Testing Checklist

- [ ] Matrix renders with 5+ students
- [ ] Matrix renders with 10+ chapters
- [ ] Horizontal scroll works smoothly
- [ ] Student column stays visible while scrolling chapters
- [ ] Actions (kebab menu) column stays visible
- [ ] **No gap visible between student & actions columns when scrolling**
- [ ] Click proficiency cell → modal opens
- [ ] Select level in modal → cell updates color
- [ ] Click drop student → row removed
- [ ] Loading state displays
- [ ] Empty state displays
- [ ] Error state displays

### Browser Testing

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (if available)
- Dark mode toggle

---

## Related Files

- **Parent Component:** `client/src/new-ui/batches/pages/BatchDetails.tsx`
- **Evaluation Modal:** `client/src/new-ui/batches/components/MatrixEvaluationModal.tsx`
- **Hooks:** `client/src/new-ui/batches/hooks/useBatchProgress.ts`
- **Types:** `client/src/new-ui/batches/types/matrix.ts`
- **Utils:** `client/src/new-ui/batches/utils/matrix-utils.ts`

---

## Questions for External Contributor

1. What is the exact gap width (in pixels) when scrolling horizontally?
2. Does the gap change based on zoom level or viewport width?
3. Can you reproduce the gap in a minimal React example with TanStack Table?
4. Have you tested with different browser rendering engines?
5. Is the gap consistent between the header row and body rows, or different?

---

**Document created:** January 2, 2026  
**Last reviewed:** January 2, 2026  
**Status:** Ready for external review
