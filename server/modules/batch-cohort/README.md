# Batch & Cohort Module

## Purpose
Handles the logistical and scheduling aspects of the LMS. Batches serve as the "container" for a group of students learning together under an instructor.

## Responsibilities
- **Batch Management**: Creation, scheduling, and lifecycle of batches.
- **Enrollment**: Manages student enrollment in batches (Active, Dropped, Completed).
- **Instructor Assignment**: specialized primary and co-instructor assignments.
- **Scheduling**: Tracks class schedules and recurring meetings.

## Key Domain Invariants
1.  **No Progress Ownership**: Batches exist for coordination. **Batches do NOT own student progress**; progress is independent of the batch.
2.  **Many-to-Many**: A student can belong to multiple batches over time or simultaneously.
3.  **Instructor Context**: Instructors gain visibility into students *through* batch association.

## Exports
- `batchService`: Business logic for batches.
- `batchStorage`: Data access for batches and enrollments.
