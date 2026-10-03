'use client'

import { useSyncExternalStore } from 'react'

import { useCourseSlug } from '@/lib/course'
import { coursePath } from '@/lib/course-path'
import { notify } from '@/lib/toast'

const subscribeToNothing = () => () => {}
const currentOrigin = () => window.location.origin

/**
 * The public application form's address for this course (`/<course>/register`, which needs no
 * account), with copy and — where the browser offers one — share, so a teacher can hand it to
 * prospective students. The origin is only known in the browser, so the server render and first
 * paint show nothing, then the link fills in.
 */
export function RegistrationLink() {
  const origin = useSyncExternalStore(subscribeToNothing, currentOrigin, () => null)
  const course = useCourseSlug()
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'

  if (!origin) return null
  const url = `${origin}${coursePath(course, '/register')}`

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      notify.success('Registration link copied.')
    } catch {
      notify.error("Couldn't copy the link.", 'Select it and copy it by hand instead.')
    }
  }

  async function share() {
    try {
      await navigator.share({ title: 'Register', text: 'Register here:', url })
    } catch (error) {
      // Closing the share sheet rejects with an AbortError — not a failure.
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        notify.error("Couldn't open the share sheet.")
      }
    }
  }

  const button =
    'label border border-ink/25 px-4 py-2 text-ink transition-colors hover:border-ink/60'

  return (
    <section className="sheet flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <p className="label text-ink-muted">Registration link</p>
        <input
          readOnly
          value={url}
          aria-label="Registration link"
          onFocus={e => e.currentTarget.select()}
          className="mt-2 w-full bg-transparent font-mono text-[0.8125rem] outline-none"
        />
      </div>
      <div className="flex gap-3">
        <button type="button" onClick={() => void copy()} className={button}>
          Copy
        </button>
        {canShare && (
          <button type="button" onClick={() => void share()} className={button}>
            Share
          </button>
        )}
      </div>
    </section>
  )
}
