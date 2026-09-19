import { RegisterForCourse } from '@/components/register-for-course'

// `/vedam/register` — the application form for the course in the URL. Public: an applicant has no
// account yet. The course is the `[course]` segment, validated by this segment's layout.
export default function CourseRegisterPage() {
  return <RegisterForCourse />
}
