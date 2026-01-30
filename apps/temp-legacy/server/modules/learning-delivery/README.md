# Learning Delivery Module

## Purpose
Handles the core business logic for student learning, including progress tracking, proficiency evaluation, and content access controls. This module bridges the gap between static content and dynamic student engagement.

## Responsibilities
- **Progress Tracking**: Records student progress at the Chapter level (Student + Chapter).
- **Proficiency Management**: Manages the 0-4 proficiency scale implementation.
- **Access Control**: Determines which chapters are unlocked for a student based on gating rules.
- **Student Dashboard**: Aggregates data for the student's learning view.

## key Domain Invariants
1.  **Progress Granularity**: Progress is strictly tracked at the **Student + Chapter** level. It is **NOT** batch-scoped or track-scoped.
2.  **Proficiency Flow**: Proficiency movement is non-linear and reversible (instructors can downgrade).
3.  **Authentication**: Students can only view their own progress. Instructors can view progress of students in their batches.

## Exports
- `learningService`: Singleton instance of the service layer.
- `learningStorage`: Data access layer for learning records.
- Types: `StudentProgressDTO`, `ChapterAccessDTO`.
