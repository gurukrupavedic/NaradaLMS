# VedicLMS – Structured Domain & Product Vision

## 1. Purpose of This Document
This document consolidates and structures the evolving ideas, decisions, and clarifications behind **VedicLMS**, transforming a long-form braindump into a clean, coherent, and reusable reference.

This is **not** a frozen requirements document. It captures:
- Stable domain truths
- Agreed workflows
- Intentional non-goals
- Clear role boundaries
- Future-facing ideas (explicitly marked)

---

## 2. Institutional Context

### 2.1 Nature of the Pathasala
- Traditional Veda Pathasala operating under **Guru–Śiṣya Paramparā**
- Serves householders balancing Vedic study with modern life
- Operates on trust, flexibility, and volunteerism
- Correctness and purity of recitation take precedence over speed or scale

### 2.2 Curriculum Model
- **8 Tracks (Semesters)** forming a progressive curriculum
- Each track contains multiple **chapters**
- Curriculum is universal; batches are logistical, not curricular
- Tracks and chapters may evolve over time

**Key Principle**
> Student progress is always tracked at **Student + Chapter**, never Batch or Track.

---

## 3. Enrollment & Onboarding (Out of Scope – v1)

### 3.1 Pre-LMS Enrollment
- Discovery via word-of-mouth
- Applicants submit a Google Form
- Admin team vets candidates offline

### 3.2 LMS Account Creation
- Approved candidates self-register
- Registration is open; approval is manual
- On approval:
  - Account is activated
  - `student` role is assigned

**Non-Goal**
- LMS does not replace vetting workflows

---

## 4. User & Role Model

### 4.1 Core Principle
- Every person is a **User**
- Roles are additive and checkbox-based
- A user may hold multiple roles simultaneously

### 4.2 Roles
- `student`
- `instructor`
- `content_manager`
- `admin`

Roles control **capabilities**, not identity.

---

## 5. Batch Model (Intentionally Lightweight)

### 5.1 What a Batch Is
- A learning cohort for coordination
- Not a curriculum container
- Students may move between batches freely

### 5.2 Batch Properties
- Batch Name
- Batch Code / ID
- Primary Instructor
- Secondary Instructors (0..n)
- Assigned Students
- Current Track (informational only)

> “Current Track” is advisory and may be changed at any time.

---

## 6. Instructor Model

### 6.1 Instructor Assignment
- Admin assigns instructor role
- Admin assigns instructors to batches
- Each batch has:
  - One Primary Instructor
  - Zero or more Secondary Instructors

### 6.2 Instructor Flexibility
Any instructor may:
- Teach a chapter
- Evaluate a student
- Update proficiency

Designed for real-world availability and trust.

---

## 7. Proficiency & Evaluation Model

### 7.1 Tracking Unit
- Proficiency is tracked per **Student + Chapter**

### 7.2 Proficiency Levels

| Code | Meaning |
|----:|--------|
| 9 | Not yet started |
| 8 | Student absent |
| 0 | Taught / started |
| 1 | ~50% proficiency |
| 2 | ~70% (minimum to advance track) |
| 3 | ~90% (exam-ready) |
| 4 | ~95% (certified) |

### 7.3 Rules
- Only instructors can update proficiency
- Admins need instructor role to modify proficiency
- All changes must be auditable

---

## 8. Certification (Out of Scope – v1)
- Oral exams conducted offline
- Scheduling and retakes handled manually
- LMS reflects outcome via proficiency updates only

---

## 9. Student Experience

### 9.1 Learning Board
Students can:
- View batch and curriculum
- Track proficiency across chapters
- Resume from last-accessed chapter

### 9.2 Chapter Experience
- Script switching:
  - Telugu
  - Devanagari
  - English (IAST)
- Multiple audio recitations
- Learning Mode toggle:
  - Static text
  - Interactive segmented text

### 9.3 Interactive Text
- Text segmented meaningfully
- Clicking a segment plays mapped audio timestamps
- Enables looped practice

---

## 10. Instructor Experience

### 10.1 Batch Dashboard
Instructors can:
- View assigned batches
- Identify primary vs secondary role
- Change batch “current track”

### 10.2 Batch Progress Matrix
- Rows: Students
- Columns: Chapters (by selected track)
- Cells: Proficiency levels

Controls:
- Batch selector
- Track selector

---

## 11. Content Studio (Content Managers)

### 11.1 Curriculum Management
- Create / reorder tracks
- Create / reorder chapters

### 11.2 Chapter Authoring Workflow
1. Text (all scripts)
2. Audio uploads (multiple masters)
3. Text segmentation
4. Text ↔ audio timestamp mapping
5. Student preview

Audio remains whole; timestamps are authoritative.

---

## 12. Admin Center

### 12.1 User Management
- Approve / reject users
- Assign roles
- Enable / disable accounts

### 12.2 Batch Management
- Create / edit batches
- Assign instructors and students

### 12.3 Audit Logs
- Proficiency changes
- Role changes
- Critical actions

---

## 13. Explicit Non-Goals (v1)
- Enrollment automation
- Certification scheduling
- Attendance enforcement
- Student-driven progress updates
- Session scheduling

---

## 14. Future Enhancements (Optional)

### 14.1 Batch Notes
- Instructor-authored notes
- Visible to batch members

### 14.2 Evaluation Annotations
- Timestamped recitation feedback
- Stored per Student + Chapter

### 14.3 AI Evaluation (ŚruMi / SrutiMitra)
- Student audio submission
- AI pronunciation analysis
- Visual error highlighting
- Instructor workload reduction

---

## 15. Guiding Philosophy
- Trust-first system design
- Minimal enforcement, maximum clarity
- Traditional pedagogy, modern tooling
- Visibility without micromanagement

---

*This document is intended to evolve while remaining a stable reference for VedicLMS decisions.*
