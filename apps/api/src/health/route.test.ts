import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Response } from 'express'

vi.mock('@narada/env', () => ({ env: { DB_READY_TIMEOUT_MS: 50 } }))
vi.mock('../naradaRoute', () => ({ publicRoute: (handler: unknown) => handler }))

const routes = new Map<string, (args: { res: Response; db: unknown }) => Promise<void>>()

vi.mock('express', () => ({
  Router: () => ({
    get: (path: string, handler: (args: { res: Response; db: unknown }) => Promise<void>) => {
      routes.set(path, handler)
    },
  }),
}))

describe('health route', () => {
  let res: Response

  beforeEach(async () => {
    routes.clear()
    vi.resetModules()
    await import('./route')
    res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as unknown as Response
  })

  it('GET /ready returns 200 when the database check succeeds', async () => {
    const db = { execute: vi.fn().mockResolvedValue(undefined) }
    await routes.get('/ready')!({ res, db })

    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({ status: 'ready', checks: { database: 'up' } })
  })

  it('GET /ready returns 503 when the database check hangs past the deadline', async () => {
    const db = { execute: vi.fn(() => new Promise(() => {})) }
    await routes.get('/ready')!({ res, db })

    expect(res.status).toHaveBeenCalledWith(503)
    expect(res.json).toHaveBeenCalledWith({ status: 'not ready', checks: { database: 'down' } })
  })

  it('GET /ready returns 503 when the database check rejects', async () => {
    const db = { execute: vi.fn().mockRejectedValue(new Error('connection refused')) }
    await routes.get('/ready')!({ res, db })

    expect(res.status).toHaveBeenCalledWith(503)
    expect(res.json).toHaveBeenCalledWith({ status: 'not ready', checks: { database: 'down' } })
  })
})
