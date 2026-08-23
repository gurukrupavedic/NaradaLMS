import { notFound } from 'next/navigation'

import { AppShell, type NavigationItem } from '@/components/app-shell'
import { StudentHistoryContent } from '@/components/teacher/student-history-content'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { ExamIcon, HouseIcon } from '@/components/ui/icons'
import { getBatch, getBatchesForProfile } from '@/lib/api/batches'
import { getStudentEvaluations } from '@/lib/api/evaluations'
import { fetchAllPages } from '@/lib/api/pagination'
import { getTracks } from '@/lib/api/tracks'
import { getCurrentChapter, getPastBatches, toRosterStudent } from '@/lib/roster'
import { getCurrentProfile } from '@/lib/session'

const navItems: NavigationItem[] = [
  { label: 'Dashboard', icon: HouseIcon, href: '/' },
  { label: 'Exams', icon: ExamIcon, href: '/exams' },
]

export default async function StudentHistoryPage({
  params,
}: {
  params: Promise<{ batchId: string; studentId: string }>
}) {
  const { batchId, studentId } = await params

  const batch = await getBatch(batchId).catch(() => null)
  if (!batch) notFound()

  const member = batch.members.find(m => m.profileId === studentId)
  if (!member) notFound()

  const [tracks, historyRows, pastBatches, profile] = await Promise.all([
    getTracks(),
    getStudentEvaluations(batchId, studentId),
    fetchAllPages(cursor => getBatchesForProfile(studentId, { cursor })),
    getCurrentProfile(),
  ])

  const track = tracks.find(t => t.id === batch.trackId)
  if (!track) notFound()

  const trackMap = new Map(tracks.map(t => [t.id, t]))
  const student = toRosterStudent(member)
  const currentChapter = getCurrentChapter(historyRows, track.chapters, studentId)
  const chapterById = new Map(track.chapters.map(chapter => [chapter.id, chapter]))
  const evaluatorNameById = new Map(batch.members.map(m => [m.profileId, m.name]))

  return (
    <AppShell navigationItems={navItems} profile={profile}>
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <Breadcrumb
          items={[
            { label: 'Dashboard', href: '/' },
            { label: batch.code, href: `/?batch=${batch.id}` },
            { label: student.name },
          ]}
        />

        <div>
          <h1 className="font-serif text-2xl font-semibold">Learning record</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Readonly profile details and chronological evaluation marks.
          </p>
        </div>

        <StudentHistoryContent
          batchId={batch.id}
          student={student}
          currentChapter={currentChapter}
          historyRows={historyRows}
          chapterById={chapterById}
          evaluatorNameById={evaluatorNameById}
          pastBatches={getPastBatches(pastBatches, trackMap, batch.id)}
        />
      </div>
    </AppShell>
  )
}
