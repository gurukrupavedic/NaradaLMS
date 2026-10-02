'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import { ScreenError } from '@/components/screen-error'
import { ScreenSkeleton } from '@/components/skeletons'
import { Spinner } from '@/components/spinner'
import { Standing } from '@/components/standing'
import { useCoursePath, useCourseSlug } from '@/lib/course'
import { pluralize } from '@/lib/pluralize'
import { courseQuery, docChapterUploadJobQuery, keys } from '@/lib/query/options'
import { useUploadDocChapterSet, type DocChapterUploadInput } from '@/lib/query/use-doc-chapter-mutations'

const SCRIPTS: { key: keyof DocChapterUploadInput; label: string }[] = [
  { key: 'sa', label: 'Sanskrit (Devanagari)' },
  { key: 'te', label: 'Telugu' },
  { key: 'en', label: 'English / IAST' },
]

/**
 * Upload the 3 source documents for a course's doc chapters. A one-time-ish admin action, not a
 * recurring editor: three files in, a parse job started, its progress watched here until it's
 * done — the actual cleanup/assignment work happens later, per doc chapter, elsewhere.
 */
export function UploadDocChaptersForm() {
  const slug = useCourseSlug()
  const { data: course, error } = useQuery(courseQuery(slug))

  if (error) return <ScreenError error={error} />
  if (!course) return <ScreenSkeleton rows={4} />

  return <UploadForm courseId={course.id} />
}

function UploadForm({ courseId }: { courseId: string }) {
  const cp = useCoursePath()
  const [files, setFiles] = useState<Partial<DocChapterUploadInput>>({})
  const [jobId, setJobId] = useState<string | null>(null)
  const upload = useUploadDocChapterSet(courseId)

  const allSelected = Boolean(files.sa && files.te && files.en)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!files.sa || !files.te || !files.en) return
    upload.mutate(
      { sa: files.sa, te: files.te, en: files.en },
      { onSuccess: result => setJobId(result.jobId) },
    )
  }

  if (jobId) {
    return (
      <UploadStatus
        courseId={courseId}
        jobId={jobId}
        onStartOver={() => {
          setJobId(null)
          setFiles({})
        }}
      />
    )
  }

  return (
    <>
      <Standing eyebrow="Administration" headline="Upload source documents" />

      <div className="mx-auto max-w-2xl px-5 py-9">
        <form onSubmit={handleSubmit} className="sheet space-y-6 px-5 py-6">
          <p className="text-[0.875rem] text-ink-muted">
            Upload the same chant text as three parallel Word documents — Sanskrit, Telugu, and an
            English/IAST transliteration. Headings and verses are matched and aligned by content,
            not position, so the three can differ in formatting as long as the chant text itself
            lines up.
          </p>

          {SCRIPTS.map(script => (
            <label key={script.key} className="block">
              <span className="label block text-ink-muted">{script.label}</span>
              <input
                type="file"
                required
                accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={e =>
                  setFiles(current => ({ ...current, [script.key]: e.target.files?.[0] }))
                }
                className="label mt-2 block w-full text-ink-muted file:mr-3 file:border file:border-rule file:bg-transparent file:px-3 file:py-1.5 file:font-[inherit] file:text-[inherit] file:text-ink file:transition-colors hover:file:border-vermilion hover:file:text-vermilion"
              />
            </label>
          ))}

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={upload.isPending || !allSelected}
              aria-busy={upload.isPending}
              className="label inline-flex items-center gap-2 bg-ink px-4 py-2 text-paper transition-opacity disabled:opacity-50"
            >
              {upload.isPending && <Spinner />}
              {upload.isPending ? 'Uploading…' : 'Parse documents'}
            </button>
            <Link href={cp('/admin/doc-chapters')} className="label text-ink-muted transition-colors hover:text-ink">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </>
  )
}

function UploadStatus({
  courseId,
  jobId,
  onStartOver,
}: {
  courseId: string
  jobId: string
  onStartOver: () => void
}) {
  const cp = useCoursePath()
  const queryClient = useQueryClient()
  const { data: job, error } = useQuery(docChapterUploadJobQuery(courseId, jobId))

  // A completed parse changes every search result for this course — refresh the list screen's
  // cache now rather than leaving it to go stale until something else happens to invalidate it.
  useEffect(() => {
    if (job?.status === 'completed') {
      void queryClient.invalidateQueries({ queryKey: keys.docChapters.all })
    }
  }, [job?.status, queryClient])

  return (
    <>
      <Standing eyebrow="Administration" headline="Parsing source documents" />

      <div className="mx-auto max-w-2xl px-5 py-9">
        <div className="sheet space-y-5 px-5 py-6">
          {error ? (
            <ScreenError error={error} />
          ) : !job ? (
            <p className="flex items-center gap-2 text-[0.9375rem] text-ink-muted">
              <Spinner /> Starting…
            </p>
          ) : job.status === 'failed' ? (
            <>
              <p className="label text-vermilion">Parsing failed</p>
              <p className="text-[0.875rem] text-ink-muted">
                {job.error ?? 'An unexpected error occurred.'}
              </p>
              <button
                type="button"
                onClick={onStartOver}
                className="label border border-rule px-3 py-1.5 text-ink-muted transition-colors hover:border-vermilion hover:text-vermilion"
              >
                Try again
              </button>
            </>
          ) : job.status === 'completed' ? (
            <>
              <p className="label text-vermilion">Done</p>
              <p className="text-[0.875rem] text-ink-muted">
                {pluralize(job.result?.headingsUpserted ?? 0, 'heading')} parsed
                {job.result && job.result.headingsSkipped > 0
                  ? `, ${pluralize(job.result.headingsSkipped, 'heading')} left untouched (already assigned).`
                  : '.'}
              </p>
              <Link
                href={cp('/admin/doc-chapters')}
                className="label text-ink underline decoration-vermilion/40 decoration-1 underline-offset-4 transition-colors hover:decoration-vermilion"
              >
                View doc chapters →
              </Link>
            </>
          ) : (
            <>
              <p className="flex items-center gap-2 text-[0.9375rem] text-ink-muted">
                <Spinner /> {job.status === 'active' ? 'Parsing…' : 'Queued…'}
              </p>
              <div className="h-1.5 w-full bg-ink/[0.07]">
                <div
                  className="h-full bg-indigo transition-[width]"
                  style={{ width: `${job.progress}%` }}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
