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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { useCoursePath } from '@/lib/course'

/**
 * The command palette — Cmd/Ctrl+K anywhere in the app, or the "Search" button in `AppShell`'s
 * header. Built on cmdk's `Command` (`components/ui/command.tsx`, shadcn's own primitive for
 * this) rather than a hand-rolled list, so keyboard highlight, scroll-into-view, and selection are
 * cmdk's problem, not ours — the same reasoning that motivated switching in the first place.
 *
 * `shouldFilter={false}`: cmdk's own filter matches a single search string per item, but this
 * needs `tokenMatch`-style multi-word/multi-field matching across several already-cached queries
 * (see `buildGroups` below), so filtering stays ours — cmdk only owns *which of the items we hand
 * it* is currently highlighted and how the list scrolls to follow that.
 *
 * There's no dedicated search endpoint: opening the palette simply subscribes to the same
 * TanStack Query caches the rest of the app already populates (`catalogTracksQuery`, a
 * `batchesWithRosterQuery`, `registrationsQuery`), and every keystroke filters that already-fetched
 * data client-side rather than sending a request. Every one of those underlying endpoints already
 * scopes its response server-side to what the caller is allowed to see (an admin's self-lookup
 * resolves to every batch in the school, anyone else's to just their own; content read view drops
 * drafts for a non-admin), so filtering the result client-side can't show anyone more than they
 * could already reach by browsing. Registrations are the one category still fetched only for
 * `hasAdminAccess` — anyone else's request would just 403.
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

// `cp` puts the current course in front of a path (`useCoursePath()`).
function hrefFor(result: SearchResult, cp: (path: string) => string): string {
  switch (result.kind) {
    case 'student':
      return cp(`/students/${result.id}`)
    case 'batch':
      return cp(`/admin/batches/${result.code}`)
    case 'track':
      return cp(`/admin/tracks/${result.id}`)
    case 'chapter':
      return cp(`/chapters/${result.code}`)
    case 'registration':
      return cp(`/admin/registrations/${result.id}`)
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

  // Deduped by profileId — the same person can show up on more than one batch's roster. Matches
  // name, phone, or email — mirrors apps/api/src/profiles/repository.ts's `search` (the admin
  // add-student drawer's own student search), which this palette's search had drifted from.
  const studentsById = new Map<string, SearchResult>()
  for (const batch of data.batches) {
    for (const member of batch.members) {
      if (
        !studentsById.has(member.profileId) &&
        matchesQuery(query, [member.name, member.phone, member.email])
      ) {
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
  const cp = useCoursePath()
  const router = useRouter()
  const hasAdminAccess = Boolean(useHasAdminAccess())
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

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

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) setQuery('')
  }

  function navigateTo(result: SearchResult) {
    router.push(hrefFor(result, cp))
    handleOpenChange(false)
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
            className="fixed top-[14%] left-1/2 z-50 w-[calc(100%-2.5rem)] max-w-xl -translate-x-1/2 overflow-hidden border border-rule bg-card shadow-none outline-none data-[ending-style]:opacity-0 data-[starting-style]:opacity-0"
          >
            <Dialog.Title className="sr-only">Search</Dialog.Title>
            <Dialog.Description className="sr-only">
              Search students, batches, tracks, chapters, and registrations.
            </Dialog.Description>

            <Command shouldFilter={false} className="bg-card text-ink">
              <div className="flex items-center gap-3 border-b border-rule px-4 py-3">
                <Search className="size-4 shrink-0 text-ink-muted" aria-hidden />
                <CommandInput
                  ref={inputRef}
                  value={query}
                  onValueChange={setQuery}
                  placeholder="Search students, batches, tracks, chapters…"
                  className="text-[0.9375rem] text-ink placeholder:text-ink-muted/50"
                />
                <span className="label shrink-0 text-ink-muted/60">Esc</span>
              </div>

              <CommandList className="max-h-[60vh]">
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
                ) : (
                  <>
                    <CommandEmpty className="px-4 py-8 text-center text-[0.8125rem] text-ink-muted">
                      No matches for &ldquo;{trimmedQuery}&rdquo;.
                    </CommandEmpty>
                    {groups.map(group => (
                      <CommandGroup
                        key={group.kind}
                        // A styled element, not a bare string: cmdk renders `heading` inside its
                        // own `[cmdk-group-heading]` wrapper div, which never gets a className of
                        // its own — only reachable via a parent-level arbitrary descendant
                        // selector (`**:[[cmdk-group-heading]]:...`, as `components/ui/command.tsx`
                        // does for its own defaults). That works for plain Tailwind utilities, but
                        // this app's `.label` typography is a hand-written CSS class, not a
                        // Tailwind-generated one, so it never matched through that selector —
                        // passing a real element here sets it directly on something we render.
                        // The `!` overrides force out `command.tsx`'s own px-2/py-1.5 padding on
                        // the wrapper div — same-specificity utilities on the same element (its
                        // `px-2` vs. this `px-4`) don't reliably resolve by source order otherwise.
                        heading={
                          <span className="label text-ink-muted/70">{KIND_LABEL[group.kind]}</span>
                        }
                        className="border-b border-rule-soft pb-1 last:border-0 **:[[cmdk-group-heading]]:px-4! **:[[cmdk-group-heading]]:pt-3! **:[[cmdk-group-heading]]:pb-1!"
                      >
                        {group.results.map(result => {
                          const Icon = KIND_ICON[result.kind]
                          return (
                            <CommandItem
                              key={`${result.kind}-${result.id}`}
                              value={`${result.kind}-${result.id}`}
                              onSelect={() => navigateTo(result)}
                              className={cn(
                                'px-4 py-2.5 text-[0.8125rem] text-ink-muted',
                                'data-[selected=true]:bg-ink/[0.04] data-[selected=true]:text-ink',
                              )}
                            >
                              <Icon className="size-4 shrink-0 text-ink-muted/70" aria-hidden />
                              <span className="flex-1 truncate">{result.title}</span>
                              {result.subtitle && (
                                <span className="shrink-0 truncate text-ink-muted/60">
                                  {result.subtitle}
                                </span>
                              )}
                            </CommandItem>
                          )
                        })}
                      </CommandGroup>
                    ))}
                  </>
                )}
              </CommandList>
            </Command>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  )
}
