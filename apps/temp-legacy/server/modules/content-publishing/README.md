# Content & Publishing Module

## Purpose
Manages the lifecycle of educational content, including Tracks, Chapters, and Text Segments. It is responsible for authing, versioning, and structuring the curriculum.

## Responsibilities
- **Content Hierarchy**: Manages the Track > Chapter > Segment structure.
- **Multilingual Support**: Handles content in Telugu, Devanagari, and English (IAST).
- **Publishing Workflow**: Manages Draft vs. Published states.
- **Segmentation**: Manages the atomic text segments used for interactive learning.

## Key Domain Invariants
1.  **Dual Modes**: Supports both "Reading Mode" (rich text) and "Interactive Mode" (segmented).
2.  **Script Fidelity**: Scripts are authored variants, not runtime transliterations.
3.  **Deletion Safety**: **Published content cannot be hard-deleted** to preserve student progress integrity.
4.  **Visibility**: Draft content is visible only to Content Managers and Admins.

## Exports
- `contentService`: Singleton instance for content operations.
- `contentStorage`: Data access layer for content.
- Types: `Track`, `Chapter`, `TextSegment`.
