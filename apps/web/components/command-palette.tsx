'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Dialog } from '@base-ui/react/dialog'
import { BookOpen, ClipboardList, FileText, Search, UserPlus, Users } from 'lucide-react'

import { cn } from '@/lib/utils'
import { useHasAdminAccess } from '@/lib/auth/profile-store'
import { batchesWithRosterQuery, catalogTracksQuery, registrationsQuery } from '@/lib/query/options'
import type { ApiBatchWithRole, ApiRegistration } from '@/lib/api/api-types'
import type { CatalogTrack } from '@/lib/mock-catalog'

/**
 * The command palette — Cmd/Ctrl+K anywhere in the app, or the "Search" button in `AppShell`'s
 * header. Unlike the first version of this feature, there's no dedicated search endpoint: opening
 * the palette simply subscribes to the same TanStack Query caches the rest of the app already
 * populates (`catalogTracksQuery`, `batchesWithRosterQuery`, `registrationsQuery`), and every
 * keystroke filters that already-fetched data client-side rather than sending a request. If you'd
 * already visited a page that warmed one of those caches, opening the palette costs nothing extra;
 * if not, opening it *is* what warms it — completeness no longer depends on which pages you
 * happened to click through first.
 *
 * Every one of those underlying endpoints already scopes its response server-side to what the
 * caller is allowed to see (an admin's self-lookup resolves to every batch in the school, anyone
 * else's to just their own; content read view drops drafts for a non-admin), so filtering the
 * result client-side can't show anyone more than they could already reach by browsing.
 * Registrations are the one category still fetched only for `hasAdminAccess` — anyone else's
 * request would just 403.
 */

const RESULT_LIMIT = 6

type ResultKind = 'student' | 'batch' | 'track' | 'chapter' | 'registration'

type SearchResult = {
  kind: ResultKind
  id: string
  code: string | null
  title: string
  subtitle: string | null
}

const KIND_ORDER: ResultKind[] = ['student', 'batch', 'track', 'chapter', 'registration']

const KIND_LABEL: Record<ResultKind, string> = {
  student: 'Students',
  batch: 'Batches',
  track: 'Tracks',
  chapter: 'Chapters',
  registration: 'Registrations',
}

const KIND_ICON: Record<ResultKind, React.ComponentType<{ className?: string }>> = {
  student: Users,
  batch: ClipboardList,
  track: BookOpen,
  chapter: FileText,
  registration: UserPlus,
}

function hrefFor(result: SearchResult): string {
  switch (result.kind) {
    case 'student':
      return `/students/${result.id}`
    case 'batch':
      return `/admin/batches/${result.code}`
    case 'track':
      return `/admin/tracks/${result.id}`
    case 'chapter':
      return `/chapters/${result.code}`
    case 'registration':
      return `/admin/registrations/${result.id}`
  }
}

/** Every token in `query` must appear, case-insensitively, somewhere across `texts` — mirrors
 * `apps/api/src/utils/search.ts`'s `tokenMatch`, so "1 track" still finds "Track 1" here too. */
function matchesQuery(query: string, texts: (string | null | undefined)[]): boolean {
  const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
  if (tokens.length === 0) return false
  const haystacks = texts.filter((t): t is string => Boolean(t)).map(t => t.toLowerCase())
  return (
    tokens.length > 0 &&
    haystacks.length > 0 &&
    tokens.every(token => haystacks.some(h => h.includes(token)))
  )
}

function buildGroups(
  query: string,
  data: { tracks: CatalogTrack[]; batches: ApiBatchWithRole[]; registrations: ApiRegistration[] },
): { kind: ResultKind; results: SearchResult[] }[] {
  const trackNameById = new Map(data.tracks.map(t => [t.id, t.name]))

  const trackResults: SearchResult[] = data.tracks
    .filter(t => matchesQuery(query, [t.name]))
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, RESULT_LIMIT)
    .map(t => ({ kind: 'track', id: t.id, code: null, title: t.name, subtitle: null }))

  const chapterResults: SearchResult[] = data.tracks
    .flatMap(t => t.chapters.map(c => ({ ...c, trackName: t.name })))
    .filter(c => matchesQuery(query, [c.title, c.code]))
    .sort((a, b) => a.title.localeCompare(b.title))
    .slice(0, RESULT_LIMIT)
    .map(c => ({ kind: 'chapter', id: c.id, code: c.code, title: c.title, subtitle: c.trackName }))

  const batchResults: SearchResult[] = data.batches
    .filter(b => matchesQuery(query, [b.code]))
    .sort((a, b) => a.code.localeCompare(b.code))
    .slice(0, RESULT_LIMIT)
    .map(b => ({
      kind: 'batch',
      id: b.id,
      code: b.code,
      title: b.code,
      subtitle: trackNameById.get(b.trackId) ?? null,
    }))

  // Deduped by profileId — the same person can show up on more than one batch's roster.
  const studentsById = new Map<string, SearchResult>()
  for (const batch of data.batches) {
    for (const member of batch.members) {
      if (!studentsById.has(member.profileId) && matchesQuery(query, [member.name])) {
        studentsById.set(member.profileId, {
          kind: 'student',
          id: member.profileId,
          code: null,
          title: member.name,
          subtitle: member.city,
        })
      }
    }
  }
  const studentResults = [...studentsById.values()]
    .sort((a, b) => a.title.localeCompare(b.title))
    .slice(0, RESULT_LIMIT)

  const registrationResults: SearchResult[] = data.registrations
    .filter(r => matchesQuery(query, [r.firstName, r.lastName, r.email, r.phone]))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, RESULT_LIMIT)
    .map(r => ({
      kind: 'registration',
      id: r.id,
      code: null,
      title: `${r.firstName} ${r.lastName}`,
      subtitle: r.status,
    }))

  const byKind: Record<ResultKind, SearchResult[]> = {
    student: studentResults,
    batch: batchResults,
    track: trackResults,
    chapter: chapterResults,
    registration: registrationResults,
  }

  return KIND_ORDER.map(kind => ({ kind, results: byKind[kind] })).filter(g => g.results.length > 0)
}

export function CommandPalette() {
  const router = useRouter()
  const hasAdminAccess = Boolean(useHasAdminAccess())
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleGlobalKeyDown(e: KeyboardEvent) {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen(o => !o)
      }
    }

    document.addEventListener('keydown', handleGlobalKeyDown)
    return () => document.removeEventListener('keydown', handleGlobalKeyDown)
  }, [])

  // Arrow-key navigation moves `activeIndex`, but nothing about a plain `<ul>`/`<li>` list scrolls
  // its container along with it — unlike cmdk's Command (which this app doesn't use; see
  // `components/ui/`), a highlighted row past the visible edge just stays off-screen. `block:
  // 'nearest'` is a no-op when the row's already visible, so this doesn't fight mouse hover either.
  useEffect(() => {
    listRef.current
      ?.querySelector(`[data-index="${activeIndex}"]`)
      ?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  // Enabled only while open: rendering the palette at all (via AppShell, on every page) shouldn't
  // by itself cost a fetch — opening it is the trigger, the same way visiting the pages that
  // otherwise populate these caches would be.
  const catalogQuery = useQuery({ ...catalogTracksQuery(), enabled: open })
  const batchesQuery = useQuery({ ...batchesWithRosterQuery(), enabled: open })
  const pendingQuery = useQuery({
    ...registrationsQuery('pending'),
    enabled: open && hasAdminAccess,
  })
  const approvedQuery = useQuery({
    ...registrationsQuery('approved'),
    enabled: open && hasAdminAccess,
  })
  const rejectedQuery = useQuery({
    ...registrationsQuery('rejected'),
    enabled: open && hasAdminAccess,
  })

  const isLoading =
    catalogQuery.isLoading ||
    batchesQuery.isLoading ||
    (hasAdminAccess &&
      (pendingQuery.isLoading || approvedQuery.isLoading || rejectedQuery.isLoading))

  const isError =
    catalogQuery.isError ||
    batchesQuery.isError ||
    (hasAdminAccess && (pendingQuery.isError || approvedQuery.isError || rejectedQuery.isError))

  const trimmedQuery = query.trim()

  const groups = useMemo(() => {
    if (!open || trimmedQuery.length === 0) return []
    return buildGroups(trimmedQuery, {
      tracks: catalogQuery.data ?? [],
      batches: batchesQuery.data ?? [],
      registrations: hasAdminAccess
        ? [
            ...(pendingQuery.data ?? []),
            ...(approvedQuery.data ?? []),
            ...(rejectedQuery.data ?? []),
          ]
        : [],
    })
  }, [
    open,
    trimmedQuery,
    catalogQuery.data,
    batchesQuery.data,
    hasAdminAccess,
    pendingQuery.data,
    approvedQuery.data,
    rejectedQuery.data,
  ])

  const flat = useMemo(() => groups.flatMap(g => g.results), [groups])

  // Reset the selection whenever the query changes, so an old row's position doesn't carry over to
  // an unrelated new result set. Adjusted during render (React's own pattern for this) rather than
  // in an effect, which would cascade an extra render on every keystroke.
  const [settledQuery, setSettledQuery] = useState(query)
  if (settledQuery !== query) {
    setSettledQuery(query)
    setActiveIndex(0)
  }

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) {
      setQuery('')
      setActiveIndex(0)
    }
  }

  function navigateTo(result: SearchResult) {
    router.push(hrefFor(result))
    handleOpenChange(false)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex(i => (flat.length === 0 ? 0 : (i + 1) % flat.length))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex(i => (flat.length === 0 ? 0 : (i - 1 + flat.length) % flat.length))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const selected = flat[activeIndex]
      if (selected) navigateTo(selected)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="label flex items-center gap-2 text-ink-muted transition-colors hover:text-ink"
        aria-label="Search"
      >
        <Search className="size-4" aria-hidden />
        <span className="hidden sm:inline">Search</span>
        <span className="hidden border border-rule px-1.5 py-0.5 text-[0.625rem] text-ink-muted/70 sm:inline">
          ⌘K
        </span>
      </button>

      <Dialog.Root open={open} onOpenChange={handleOpenChange}>
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-40 bg-ink/40 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
          <Dialog.Popup
            initialFocus={inputRef}
            className="fixed top-[14%] left-1/2 z-50 w-[calc(100%-2.5rem)] max-w-xl -translate-x-1/2 border border-rule bg-card shadow-none outline-none data-[ending-style]:opacity-0 data-[starting-style]:opacity-0"
            onKeyDown={handleKeyDown}
          >
            <Dialog.Title className="sr-only">Search</Dialog.Title>
            <Dialog.Description className="sr-only">
              Search students, batches, tracks, chapters, and registrations.
            </Dialog.Description>

            <div className="flex items-center gap-3 border-b border-rule px-4 py-3">
              <Search className="size-4 shrink-0 text-ink-muted" aria-hidden />
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search students, batches, tracks, chapters…"
                className="flex-1 bg-transparent text-[0.9375rem] text-ink outline-none placeholder:text-ink-muted/50"
              />
              <span className="label shrink-0 text-ink-muted/60">Esc</span>
            </div>

            <div ref={listRef} className="max-h-[60vh] overflow-y-auto">
              {trimmedQuery.length === 0 ? (
                <p className="px-4 py-8 text-center text-[0.8125rem] text-ink-muted">
                  Start typing to search across the school.
                </p>
              ) : isError ? (
                <p className="px-4 py-8 text-center text-[0.8125rem] text-ink-muted">
                  Couldn&rsquo;t search right now.
                </p>
              ) : isLoading ? (
                <p className="px-4 py-8 text-center text-[0.8125rem] text-ink-muted">Loading…</p>
              ) : flat.length === 0 ? (
                <p className="px-4 py-8 text-center text-[0.8125rem] text-ink-muted">
                  No matches for &ldquo;{trimmedQuery}&rdquo;.
                </p>
              ) : (
                groups.map(group => (
                  <div key={group.kind} className="border-b border-rule-soft last:border-0">
                    <p className="label px-4 pt-3 pb-1 text-ink-muted/70">
                      {KIND_LABEL[group.kind]}
                    </p>
                    <ul>
                      {group.results.map(result => {
                        const index = flat.indexOf(result)
                        const Icon = KIND_ICON[result.kind]
                        return (
                          <li key={`${result.kind}-${result.id}`}>
                            <button
                              type="button"
                              data-index={index}
                              onClick={() => navigateTo(result)}
                              onMouseEnter={() => setActiveIndex(index)}
                              className={cn(
                                'flex w-full items-center gap-3 px-4 py-2.5 text-left text-[0.8125rem] transition-colors',
                                index === activeIndex ? 'bg-ink/[0.04] text-ink' : 'text-ink-muted',
                              )}
                            >
                              <Icon className="size-4 shrink-0 text-ink-muted/70" aria-hidden />
                              <span className="flex-1 truncate">{result.title}</span>
                              {result.subtitle && (
                                <span className="shrink-0 truncate text-ink-muted/60">
                                  {result.subtitle}
                                </span>
                              )}
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                ))
              )}
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  )
}
