# Rich Text Editor - Requirements Specification

**Document Version:** 1.0  
**Last Updated:** October 28, 2025  
**Status:** LOCKED

---

## Executive Summary

The Rich Text Editor is a critical component of the Vedic Learning Management System, designed specifically for creating and editing mantra content across three languages (Telugu, Hindi/Devanagari, English/IAST). Unlike traditional prose editors, this editor is optimized for line-based mantra recitation with custom keyboard shortcuts and self-hosted Vedic fonts.

---

## Core Principle: Bi-Directional Toolbar Sync ⭐ CRITICAL

The toolbar and document content must maintain perfect two-way synchronization at all times:

### User → Document (Input Direction)
- User interacts with toolbar controls (buttons, dropdowns)
- Formatting applies correctly based on current selection or cursor position
- Changes are scoped appropriately (inline vs block formatting)

### Document → Toolbar (Output Direction)
- User moves cursor or changes text selection
- Toolbar immediately reflects current formatting state in real-time
- Dropdown menus display current values (font family, font size, heading level)
- Toggle buttons highlight when their formatting is active (bold, italic, underline, alignment, lists)

**This bidirectional sync creates the standard word processor experience users expect from applications like Microsoft Word, Google Docs, and Apple Pages.**

---

## Formatting Options Specification

### Category 1: Inline Formatting

Inline formatting applies **only to selected text**. If no text is selected, the formatting applies to subsequently typed characters.

#### 1.1 Font Family Dropdown
- **Options:** JIMS, AdishilaSanVedic, AdishilaSan, Inter
- **Applies to:** Selected text only
- **No selection behavior:** Applies to next typed characters
- **Toolbar sync:** Dropdown displays current font family at cursor position
- **TipTap command:** `setFontFamily(fontName)`

#### 1.2 Font Size Dropdown
- **Options:** 12px, 14px, 16px, 18px, 20px, 24px, 28px, 30px, 32px, 36px, 48px (11 total options)
- **Default:** 30px (matches standardized display)
- **Applies to:** Selected text only
- **No selection behavior:** Applies to next typed characters
- **Toolbar sync:** Dropdown displays current font size at cursor position
- **TipTap command:** `setFontSize(size)`

#### 1.3 Bold Button
- **Applies to:** Selected text only
- **No selection behavior:** Toggles bold state for next typed characters
- **Keyboard shortcut:** Ctrl+B (Windows/Linux), Cmd+B (Mac)
- **Toolbar sync:** Button highlights when text at cursor is bold
- **TipTap command:** `toggleBold()`

#### 1.4 Italic Button
- **Applies to:** Selected text only
- **No selection behavior:** Toggles italic state for next typed characters
- **Keyboard shortcut:** Ctrl+I (Windows/Linux), Cmd+I (Mac)
- **Toolbar sync:** Button highlights when text at cursor is italic
- **TipTap command:** `toggleItalic()`

#### 1.5 Underline Button
- **Applies to:** Selected text only
- **No selection behavior:** Toggles underline state for next typed characters
- **Keyboard shortcut:** Ctrl+U (Windows/Linux), Cmd+U (Mac)
- **Toolbar sync:** Button highlights when text at cursor is underlined
- **TipTap command:** `toggleUnderline()`

#### 1.6 Text Color Buttons
- **Color palette:** Black (#000000), Red (#ef4444), Blue (#3b82f6), Green (#22c55e)
- **Applies to:** Selected text only
- **No selection behavior:** Applies to next typed characters
- **Toolbar sync:** Currently selected color button could highlight (future enhancement)
- **TipTap command:** `setColor(colorHex)`

#### 1.7 Link Button
- **Applies to:** Selected text (selection required)
- **Behavior:** Prompts user for URL via dialog, converts selection to hyperlink
- **Link styling:** Blue text with underline (`text-blue-600 underline`)
- **Link configuration:** `openOnClick: false` (prevents accidental navigation during editing)
- **Toolbar sync:** Button highlights when cursor is within a link
- **TipTap command:** `setLink({ href: url })`

---

### Category 2: Block Formatting

Block formatting applies to **entire paragraphs or blocks**. The scope includes the paragraph containing the cursor or all paragraphs within a multi-paragraph selection.

#### 2.1 Heading Selector Dropdown
- **Options:** Paragraph (default), Heading 1, Heading 2, Heading 3, Heading 4, Heading 5, Heading 6
- **Applies to:** Entire paragraph containing cursor
- **Multi-paragraph selection:** Converts all selected paragraphs to chosen heading level
- **Toolbar sync:** Dropdown displays current heading level or "Paragraph"
- **TipTap command:** `toggleHeading({ level })` or `setParagraph()`

#### 2.2 Numbered List Button
- **Applies to:** Current paragraph or all selected paragraphs
- **Behavior:** Toggles numbered (ordered) list formatting
- **HTML output:** `<ol>` with class `ordered-list`
- **Toolbar sync:** Button highlights when cursor is in numbered list
- **TipTap command:** `toggleOrderedList()`

#### 2.3 Bullet List Button
- **Applies to:** Current paragraph or all selected paragraphs
- **Behavior:** Toggles bullet (unordered) list formatting
- **HTML output:** `<ul>` with class `bullet-list`
- **Toolbar sync:** Button highlights when cursor is in bullet list
- **TipTap command:** `toggleBulletList()`

#### 2.4 Alignment Buttons
- **Options:** Left, Center, Right, Justify
- **Applies to:** Entire paragraph or all selected paragraphs
- **Not inline:** Alignment cannot be applied to partial text within a paragraph
- **Toolbar sync:** Active alignment button highlights based on current paragraph
- **TipTap configuration:** `types: ['heading', 'paragraph']`
- **TipTap command:** `setTextAlign(alignment)`

---

### Category 3: Content Insertion

Content insertion tools insert elements at the current cursor position without requiring text selection.

#### 3.1 Image Button
- **Behavior:** Prompts user for image URL via dialog
- **Insertion point:** Current cursor position
- **Display:** Inline image with responsive sizing (`max-w-full h-auto rounded-md`)
- **Selection requirement:** None
- **TipTap command:** `setImage({ src: url })`

#### 3.2 Horizontal Rule Button
- **Behavior:** Inserts horizontal divider line
- **Insertion point:** Current cursor position
- **Use case:** Section separators
- **Selection requirement:** None
- **TipTap command:** `setHorizontalRule()`

---

## Keyboard Shortcuts

### Custom Behavior (Mantra-Optimized)

Our editor uses **non-standard** keyboard shortcuts for Enter/Shift+Enter, optimized specifically for mantra recitation workflows.

#### Enter Key → Line Break
- **Creates:** Line break within same paragraph (`<br>` tag)
- **Visual result:** New line without extra vertical spacing
- **Use case:** Breaking mantra lines for recitation rhythm
- **HTML structure:** `<p>Line 1<br>Line 2</p>`
- **Rationale:** Mantras require frequent line breaks without paragraph spacing for proper chanting flow

#### Shift+Enter → New Paragraph
- **Creates:** New paragraph block
- **Visual result:** New paragraph with vertical spacing
- **Use case:** Separating distinct mantra sections or verses
- **HTML structure:** `<p>Paragraph 1</p><p>Paragraph 2</p>`

**Design Decision:** This reverses standard word processor behavior (where Enter = paragraph, Shift+Enter = line break) because our primary use case is line-based content, not prose. Users need quick access to line breaks.

### Standard Formatting Shortcuts

- **Ctrl+B / Cmd+B** → Toggle Bold
- **Ctrl+I / Cmd+I** → Toggle Italic
- **Ctrl+U / Cmd+U** → Toggle Underline

---

## User Help System

### Info Icon Implementation

#### Location
- Positioned immediately adjacent to the HTML/Text mode toggle tabs
- Visually aligned with toolbar controls for easy discoverability

#### Interaction
- **Icon:** Information icon (ℹ️) or question mark
- **Trigger:** Click to open
- **Dismiss:** Click outside popover or press ESC key
- **State:** Non-modal, lightweight overlay

#### Content Structure

```
Keyboard Shortcuts
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Enter             → New line (for mantras)
Shift+Enter       → New paragraph

Ctrl+B            → Bold
Ctrl+I            → Italic
Ctrl+U            → Underline
```

#### Design Principles
- **Non-intrusive:** Does not interrupt editing flow
- **Always available:** Users can reference anytime
- **Progressive disclosure:** Information hidden until needed
- **Standard UX pattern:** Matches user expectations from other applications

---

## Editor Modes

### HTML Mode
- **Full rich-text editing** with complete toolbar
- All formatting options available
- WYSIWYG editing experience
- TipTap editor instance active

### Text Mode
- **Plain text view** for text segmentation workflow
- Strips all HTML formatting for display
- Used in segmentation and audio mapping features
- Read-only representation of HTML content

### Mode Persistence
- User's mode preference saved to `localStorage`
- Key: `richTextEditorMode`
- Values: `'html'` or `'text'`
- Persists across page reloads and sessions

---

## Font System

### Self-Hosted Fonts Only
- **JIMS** → Telugu script
- **AdishilaSanVedic** → Devanagari/Hindi script (with semi-bold weight 600)
- **AdishilaSan** → IAST/English script
- **Inter** → Interface text and modern Latin script

### Language-Based Defaults
When user manually switches the language selector, the default font for new content follows these mappings:
- Telugu (`te`) → JIMS
- Hindi (`hi`) → AdishilaSanVedic
- English (`en`) → AdishilaSan

**Note:** Existing content retains its current formatting. Font changes apply only to new content created after language selection.

### Font Loading
- All fonts loaded via `@font-face` in `client/src/index.css`
- Font files located in `client/public/fonts/`
- Fallback fonts: Noto Sans variants from Google Fonts

---

## Technical Specifications

### TipTap Extensions Used
1. StarterKit (base functionality)
2. TextStyle (inline style support)
3. Color (text color)
4. TextAlign (paragraph alignment)
5. Underline (underline formatting)
6. Heading (H1-H6)
7. HardBreak (line breaks)
8. HorizontalRule (divider lines)
9. OrderedList (numbered lists)
10. BulletList (bullet lists)
11. ListItem (list item nodes)
12. Link (hyperlinks)
13. Image (inline images)
14. FontFamily (font switching)
15. FontSize (custom extension for font sizing)

### Custom FontSize Extension
- **Implementation:** Custom TipTap extension
- **Attribute:** Applies `fontSize` attribute to `textStyle` mark
- **Storage:** Inline style (`style="font-size: XXpx"`)
- **Commands:** `setFontSize(size)`, `unsetFontSize()`

### Editor Configuration
- **History depth:** 100 actions
- **History delay:** 500ms for grouping edits
- **Spell check:** Disabled (multilingual content)
- **Auto-save:** Integrated with parent component's onChange handler

---

## Implementation Details

### Selection Preservation
All toolbar buttons use `onMouseDown={(e) => e.preventDefault()}` to prevent the editor from losing focus when toolbar controls are clicked. This preserves the user's text selection so formatting commands apply to the intended text.

### Toolbar State Synchronization
The component subscribes to TipTap's `selectionUpdate` and `transaction` events to force re-renders when the editor state changes. This ensures toolbar controls always reflect the current formatting at the cursor position.

### Event Listeners
```javascript
editor.on('selectionUpdate', handleUpdate);
editor.on('transaction', handleUpdate);
```

These events trigger component re-renders to update toolbar button states and dropdown values in real-time.

---

## Testing Requirements

### Manual Testing Checklist

#### Inline Formatting
- [ ] Select text, apply bold - only selection becomes bold
- [ ] Select text, apply italic - only selection becomes italic
- [ ] Select text, change font size - only selection changes
- [ ] Select text, change font family - only selection changes
- [ ] Select text, change color - only selection changes
- [ ] Place cursor, type - new text inherits cursor position formatting
- [ ] Move cursor through differently formatted text - toolbar updates in real-time

#### Block Formatting
- [ ] Change heading level - entire paragraph converts
- [ ] Apply alignment - entire paragraph aligns
- [ ] Toggle bullet list - entire paragraph becomes list item
- [ ] Toggle numbered list - entire paragraph becomes numbered item
- [ ] Select multiple paragraphs, apply heading - all convert to same heading level

#### Keyboard Shortcuts
- [ ] Enter creates line break (not paragraph)
- [ ] Shift+Enter creates new paragraph (not line break)
- [ ] Ctrl+B toggles bold on selection
- [ ] Ctrl+I toggles italic on selection
- [ ] Ctrl+U toggles underline on selection

#### Bi-Directional Sync
- [ ] Select bold text - bold button highlights
- [ ] Move cursor to italic text - italic button highlights
- [ ] Move cursor to 24px text - size dropdown shows "24px"
- [ ] Move cursor to JIMS font - font dropdown shows "JIMS"
- [ ] Move cursor to centered paragraph - center align button highlights

---

## Future Enhancements (Out of Scope)

- Color picker (currently limited to 4 preset colors)
- Text highlight/background color
- Undo/Redo buttons in toolbar (currently keyboard-only)
- Font size unit switcher (px/pt/em)
- Custom keyboard shortcut configuration
- Accessibility improvements (ARIA labels, screen reader support)
- Mobile/touch optimizations

---

## References

- **TipTap Documentation:** https://tiptap.dev/docs
- **Font Requirements:** `docs/features/font-requirements.md`
- **Component Location:** `client/src/components/ui/rich-text-editor.tsx`
- **Related Components:** Text Segmentation, Audio Mapping, Preview Tab
