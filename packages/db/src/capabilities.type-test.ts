/**
 * Compile-time proof of the SchoolDb/PublicDb capability boundary (HARDENING_PLAN.md §2.4,
 * §6.1). Not a runtime test — there's nothing to execute. `pnpm --filter @narada/db typecheck`
 * is the only thing that "runs" this file; a broken assertion below surfaces as a `tsc` error.
 */
import type { PublicDb, PublicDbClient, SchoolDb, SchoolDbClient } from './index'

// A root school client satisfies the narrow SchoolDb capability...
declare const schoolClient: SchoolDbClient
const _s1: SchoolDb = schoolClient

// ...and so does a transaction handed to a `.transaction(...)` callback, which is what lets
// services pass the inferred `tx` into repository functions typed `SchoolDb`.
type SchoolTx = Parameters<Parameters<SchoolDbClient['transaction']>[0]>[0]
const _s2: SchoolDb = null as unknown as SchoolTx

// Same two assertions for the public-schema capability.
declare const publicClient: PublicDbClient
const _p1: PublicDb = publicClient

type PublicTx = Parameters<Parameters<PublicDbClient['transaction']>[0]>[0]
const _p2: PublicDb = null as unknown as PublicTx

// SchoolDb must NOT be able to open its own transaction or reach the underlying pool client —
// that capability is reserved for SchoolDbClient, held only by services/application composition.
declare const s: SchoolDb
// @ts-expect-error SchoolDb must not expose transaction()
void s.transaction
// @ts-expect-error SchoolDb must not expose the pool $client
void s.$client

declare const p: PublicDb
// @ts-expect-error PublicDb must not expose transaction()
void p.transaction
// @ts-expect-error PublicDb must not expose the pool $client
void p.$client

// TODO(H8): once publicSchema/schoolSchema are split, assert PublicDb and SchoolDb are mutually non-assignable here.
