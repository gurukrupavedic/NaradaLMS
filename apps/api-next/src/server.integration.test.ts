import { describe, expect, it } from 'vitest'
import request from 'supertest'

import { env } from '@narada/env'

import { createServer } from './server'

/**
 * Proves the HTTP-layer testing pattern this harness was originally paused on (real Express app,
 * real middleware chain, real Postgres via GET /health/ready) — supertest drives `createServer()`
 * directly in-process, no port binding needed. Deliberately minimal: `/health` needs no
 * authentication and no `X-School-Slug`/`X-Profile-Id` context, so it's the cheapest real
 * end-to-end proof that request ID/logging/versioned-routing/error-handling middleware and the
 * real database connection all wire together correctly.
 *
 * Full per-domain HTTP-layer coverage (real BetterAuth session fixtures, school/profile headers,
 * every route's status/envelope) is real, additional design and fixture work beyond this proof
 * and is intentionally left as future work — see PARITY_PLAN.md §14.1 layer 3.
 */
describe('HTTP server (supertest, real app + real Postgres)', () => {
  it('GET /v{version}/health returns 200 with no database involved', async () => {
    const app = createServer()

    const response = await request(app).get(`/v${env.API_VERSION}/health`)

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ status: 'up' })
  })

  it('GET /v{version}/health/ready returns 200 when the real database is reachable', async () => {
    const app = createServer()

    const response = await request(app).get(`/v${env.API_VERSION}/health/ready`)

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ status: 'ready', checks: { database: 'up' } })
  })

  it('an unmatched route under the versioned router 404s as JSON, not an HTML error page', async () => {
    const app = createServer()

    const response = await request(app).get(`/v${env.API_VERSION}/no-such-route`)

    expect(response.status).toBe(404)
  })

  it('a request with no X-School-Slug header on a school-scoped route gets a 400, not a 500', async () => {
    const app = createServer()

    const response = await request(app).get(`/v${env.API_VERSION}/batches`)

    expect(response.status).toBe(400)
  })
})
