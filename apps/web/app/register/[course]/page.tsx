import { RegisterForCourse } from '@/components/register-for-course'

type Params = { course: string }

export default async function RegisterCoursePage({ params }: { params: Promise<Params> }) {
  const { course } = await params

  return <RegisterForCourse slug={decodeURIComponent(course)} />
}
