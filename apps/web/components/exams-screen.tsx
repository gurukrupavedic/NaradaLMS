'use client'

import { useQuery } from '@tanstack/react-query'

import { ScreenSkeleton } from '@/components/skeletons'
import { ScreenError } from '@/components/screen-error'
import { Standing } from '@/components/standing'
import { Section } from '@/components/section'
import { Pill } from '@/components/proficiency-pill'
import { CertificationRecord } from '@/components/certification-record'
import { Timestamp } from '@/components/timestamp'
import { Reveal } from '@/components/reveal'
import { examsQuery } from '@/lib/query/options'
import { ExamMarksLine } from '@/components/exam-marks-line'
import { EXAM_MAX_TOTAL, EXAM_OUTCOME_LABEL } from '@/lib/exam-grading'
import { narrowLevel } from '@/lib/api/reshape'
import { isCertified } from '@/lib/proficiency'
import { useSelectedProfileName } from '@/lib/auth/profile-store'

export function ExamsScreen() {
  const { data, error } = useQuery(examsQuery())
  const profileName = useSelectedProfileName()

  // No hooks below this point, so the early return is safe.
  if (error) return <ScreenError error={error} />
  if (!data) return <ScreenSkeleton rows={4} />
  const { certifications, scheduled, past } = data

  const certified = certifications.filter(c => isCertified(c.level)).length
  const total = certifications.length

  return (
    <>
      <Standing
        eyebrow={`${profileName ?? ''} · certification`}
        headline={
          certified === 0
            ? 'No certifications yet'
            : certified === total
              ? 'Every track certified'
              : `Certified in ${certified} of ${total} tracks`
        }
        meta={`${total - certified} tracks remaining · ${scheduled.length} sitting booked`}
        stats={[
          { value: `${certified}/${total}`, label: 'Certified' },
          { value: String(past.length), label: 'Sittings' },
        ]}
      />

      <div className="mx-auto max-w-5xl space-y-12 px-5 py-9">
        {/* The `exam` table tracks booked sittings and is separate from the
            certification marks below. It is routinely empty, so the section is
            omitted entirely rather than rendered as a "nothing here" panel. */}
        {scheduled.length > 0 && (
          <Reveal>
            <Section title="Booked" count={`${scheduled.length} sitting`}>
              <ol className="sheet">
                {scheduled.map(sitting => (
                  <li
                    key={sitting.id}
                    className="flex items-center gap-4 border-l-2 border-vermilion px-4 py-3"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[0.9375rem] font-medium">
                        {sitting.track}
                      </span>
                      <span className="label mt-0.5 block text-ink-muted">certification exam</span>
                    </span>
                    <span className="shrink-0 font-mono text-[0.75rem] text-ink-muted">
                      <Timestamp variant="dateTime" value={sitting.when} />
                    </span>
                  </li>
                ))}
              </ol>
            </Section>
          </Reveal>
        )}

        <Reveal delay={60}>
          <Section title="Certification record" count={`${certified}/${total} tracks`}>
            <CertificationRecord rows={certifications} />
          </Section>
        </Reveal>

        {past.length > 0 && (
          <Reveal delay={120}>
            <Section title="Sitting history" count={`${past.length} sittings`}>
              <ol className="sheet">
                {past.map(sitting => {
                  const result = sitting.result!
                  return (
                    <li
                      key={sitting.id}
                      className="flex items-start gap-4 border-b border-rule-soft px-4 py-3.5 last:border-0"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block text-[0.9375rem]">
                          {sitting.track} · {EXAM_OUTCOME_LABEL[result.outcome]}
                        </span>
                        <span className="label mt-1 block text-ink-muted">
                          <Timestamp variant="dateTime" value={sitting.when} /> · {result.total} /{' '}
                          {EXAM_MAX_TOTAL}
                        </span>
                        <ExamMarksLine result={result} />
                        {/* An examiner's note is the most valuable thing on this
                            page and used to be set at the same weight as the
                            metadata around it. */}
                        {result.notes && (
                          <span className="mt-2.5 block border-l border-rule py-0.5 pl-3 text-[0.8125rem] leading-relaxed text-ink-muted italic">
                            {result.notes}
                          </span>
                        )}
                      </span>
                      {result.level ? (
                        <Pill level={narrowLevel(result.level)} className="mt-1 shrink-0" />
                      ) : (
                        <span className="label mt-1 shrink-0 text-vermilion">reappear</span>
                      )}
                    </li>
                  )
                })}
              </ol>
            </Section>
          </Reveal>
        )}
      </div>
    </>
  )
}
