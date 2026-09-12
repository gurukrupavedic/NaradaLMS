'use client'

import { useEffect, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'

import {
  getAuthSession,
  listSessions,
  revokeSession,
  type AuthSessionListItem,
} from '@/lib/auth/client'
import { summarizeUserAgent } from '@/lib/user-agent'

/**
 * Every device currently holding a year-long session on this account, with a revoke button per
 * row — the counterweight to Part A's long-lived sessions: a lost phone or a screenshotted QR code
 * now has a place to be cut off from, rather than just an eventual 1-year expiry. The current
 * session (matched by id against `getAuthSession`) never gets a revoke button of its own — ending
 * your own live session belongs to `AppShell`'s "Sign out", which also clears local profile state
 * this list has no business touching.
 */
export function LinkedDevicesList() {
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [sessions, setSessions] = useState<AuthSessionListItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [revokingToken, setRevokingToken] = useState<string | null>(null)

  async function load() {
    const [session, result] = await Promise.all([getAuthSession(), listSessions()])
    setCurrentSessionId(session?.session.id ?? null)
    if (!result.data) {
      setError(result.error)
      return
    }
    setError(null)
    setSessions([...result.data].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)))
  }

  useEffect(() => {
    void (async () => {
      await load()
    })()
  }, [])

  async function handleRevoke(token: string) {
    setRevokingToken(token)
    const result = await revokeSession(token)
    setRevokingToken(null)
    if (!result.data) {
      setError(result.error)
      return
    }
    setSessions(current => current?.filter(s => s.token !== token) ?? null)
  }

  if (error) return <p className="text-[0.875rem] text-vermilion">{error}</p>
  if (!sessions) return <p className="text-[0.875rem] text-ink-muted">Loading…</p>

  if (sessions.length === 0) {
    return <p className="text-[0.875rem] text-ink-muted">No linked devices.</p>
  }

  return (
    <ul className="divide-y divide-rule-soft border-t border-rule-soft">
      {sessions.map(session => {
        const isCurrent = session.id === currentSessionId
        return (
          <li key={session.id} className="flex items-center justify-between gap-4 py-3.5">
            <div className="min-w-0">
              <p className="text-[0.9375rem] text-ink">
                {summarizeUserAgent(session.userAgent)}
                {isCurrent && <span className="label ml-2 text-vermilion">This device</span>}
              </p>
              <p className="mt-0.5 text-[0.8125rem] text-ink-muted">
                Signed in {formatDistanceToNow(new Date(session.createdAt), { addSuffix: true })}
              </p>
            </div>

            {!isCurrent && (
              <button
                type="button"
                onClick={() => handleRevoke(session.token)}
                disabled={revokingToken === session.token}
                className="label shrink-0 text-ink-muted transition-colors hover:text-vermilion disabled:pointer-events-none disabled:opacity-50"
              >
                {revokingToken === session.token ? 'Signing out…' : 'Sign out'}
              </button>
            )}
          </li>
        )
      })}
    </ul>
  )
}
