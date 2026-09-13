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

  it('an unmatched route under the versioned router 404s as JSON, not an HTML error page (DD-009)', async () => {
    const app = createServer()

    const response = await request(app).get(`/v${env.API_VERSION}/no-such-route`)

    expect(response.status).toBe(404)
    expect(response.type).toBe('application/json')
    expect(response.body).toEqual({
      ok: false,
      error: { code: 'RESOURCE_NOT_FOUND', message: 'route not found' },
    })
  })

  it('a request with no X-School-Slug header on a school-scoped route gets a 400, not a 500', async () => {
    const app = createServer()

    const response = await request(app).get(`/v${env.API_VERSION}/batches`)

    expect(response.status).toBe(400)
    expect(response.body).toEqual({
      ok: false,
      error: { code: 'INVALID_REQUEST', message: 'X-School-Slug header is required' },
    })
  })

  it('an unparseable JSON body gets a structured 400, not the generic 500 the reference backend returns (DD-009)', async () => {
    const app = createServer()

    const response = await request(app)
      .post(`/v${env.API_VERSION}/batches`)
      .set('Content-Type', 'application/json')
      .send('{not valid json')

    expect(response.status).toBe(400)
    expect(response.body).toEqual({
      ok: false,
      error: { code: 'INVALID_REQUEST', message: 'malformed JSON body' },
    })
  })

  it('echoes a caller-supplied X-Request-Id back on the response', async () => {
    const app = createServer()

    const response = await request(app)
      .get(`/v${env.API_VERSION}/health`)
      .set('X-Request-Id', 'caller-supplied-id-123')

    expect(response.headers['x-request-id']).toBe('caller-supplied-id-123')
  })

  it('generates a fresh X-Request-Id when the caller supplies none', async () => {
    const app = createServer()

    const response = await request(app).get(`/v${env.API_VERSION}/health`)

    expect(response.headers['x-request-id']).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    )
  })

  it('a request from a trusted origin gets it echoed back in Access-Control-Allow-Origin', async () => {
    const app = createServer()

    const response = await request(app).get(`/v${env.API_VERSION}/health`).set('Origin', env.TRUSTED_ORIGINS[0]!)

    expect(response.headers['access-control-allow-origin']).toBe(env.TRUSTED_ORIGINS[0])
  })

  it('a request from an untrusted origin gets no Access-Control-Allow-Origin', async () => {
    const app = createServer()

    const response = await request(app).get(`/v${env.API_VERSION}/health`).set('Origin', 'https://evil.example.com')

    expect(response.headers['access-control-allow-origin']).toBeUndefined()
  })

  it('PUT is an allowed CORS method (needed for PUT /batches/:batchId/schedule)', async () => {
    const app = createServer()

    const response = await request(app)
      .options(`/v${env.API_VERSION}/batches/${crypto.randomUUID()}/schedule`)
      .set('Origin', env.TRUSTED_ORIGINS[0]!)
      .set('Access-Control-Request-Method', 'PUT')

    expect(response.headers['access-control-allow-methods']).toContain('PUT')
  })
})
