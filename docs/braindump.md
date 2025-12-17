User Management & Authentication Requirements Summary
1. User Registration & Approval Workflow
No self-enrollment: All accounts are admin-controlled
External vetting: Students apply via Google Forms → admin reviews offline → admin approves
Two-step LMS activation: Account created → Admin approves in LMS → Auto-assigns student role
Flexible role assignment: Admin can assign any combination of roles (student, instructor, content_manager, admin) after approval
Status tracking: Users have states: pending_approval → active → inactive
2. Multi-Role Model (Independent Flags)
No hierarchy: Roles are independent checkboxes, not hierarchical
Four roles defined:
student - View published content, track own progress
instructor - View/update student progress in assigned batches
content_manager - Create/edit/publish content
admin - Full system access
Any combination allowed: A user can be student + instructor simultaneously
3. Batch Formation & Instructor Model
Instructor assignment: Two types:
Primary instructor (main teacher)
Co-instructors (TAs with identical system privileges)
Simple assignment: Any user with instructor role can be assigned to teach
No capacity limits: Batches can have any number of students/instructors
One track per batch: Each batch teaches exactly ONE track
4. Progress & Proficiency (Trust-Based)
Instructor-driven: Only instructors/admins set student proficiency levels
5-level scale: 0 (not started) → 1-3 (proficiency) → 4 (mastery/certified)
No enforcement: Levels can move in any direction (0→4, 4→1); no validation
External certification: Level 4 typically after oral exam, but system doesn't enforce
Soft prerequisites: Track sequencing recommended but not enforced by system
5. Core Principles
Trust-based over enforcement: Minimal validation, flexibility prioritized
Admin-controlled: All critical assignments happen through admin actions
Batch-centric context: Track/student/instructor relationships defined through batch assignments
Preservation of history: Student progress preserved even if reassigned between batches