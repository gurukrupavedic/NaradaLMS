'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'

import { Standing } from '@/components/standing'
import { ExamSlotsPanel } from '@/components/admin/exam-slots-panel'
import { ExamSlotRequestReview } from '@/components/admin/exam-slot-request-review'
import { examSlotRequestsQuery } from '@/lib/query/options'

type View = 'slots' | 'requests'

const VIEWS: { view: View; label: string }[] = [
  { view: 'slots', label: 'Slots' },
  { view: 'requests', label: 'Requests' },
]

/**
 * Booking a certification sitting, from the admin side: opening bookable appointments on a track
 * (`ExamSlotsPanel`) and deciding what to do with a student's request against one
 * (`ExamSlotRequestReview`) — two different resources (apps/api/src/examSlots's `examSlot` and
 * `examSlotRequest`) that share this one page and header, the same "one screen, two switchable
 * panels" shape as `AdminRegistrationsScreen`. Deliberately separate from
 * `AdminExamsScreen` (/admin/exams): that page is about *grading* an already-booked sitting, this
 * one is about how a sitting gets booked in the first place.
 */
export function AdminExamSlotsScreen() {
  // Same "read once, on mount" reasoning as AdminRegistrationsScreen — a link can open straight to
  // the requests queue with `?view=requests`.
  const searchParams = useSearchParams()
  const [view, setView] = useState<View>(searchParams.get('view') === 'requests' ? 'requests' : 'slots')
  const { data: pendingRequests } = useQuery(examSlotRequestsQuery('pending'))

  return (
    <>
      <Standing
        eyebrow="Administration"
        headline="Exam slots"
        meta="Open appointments for a track's certification exam, and decide what to do with a student's request to sit one."
      />

      <div className="mx-auto max-w-5xl px-5 pt-9">
        <div className="flex gap-5 border-b border-rule pb-2">
          {VIEWS.map(item => {
            const count = item.view === 'requests' ? pendingRequests?.length : undefined
            return (
              <button
                key={item.view}
                type="button"
                onClick={() => setView(item.view)}
                className={
                  item.view === view
                    ? 'label flex items-center gap-2 text-vermilion'
                    : 'label flex items-center gap-2 text-ink-muted transition-colors hover:text-ink'
                }
              >
                {item.label}
                {!!count && (
                  <span className="rounded-full bg-vermilion/10 px-1.5 py-0.5 text-vermilion">{count}</span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {view === 'slots' ? <ExamSlotsPanel /> : <ExamSlotRequestReview />}
    </>
  )
}
