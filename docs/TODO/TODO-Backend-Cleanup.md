# TODO - Backend Cleanup

## Scope
Tracking backend hardening items for later execution. No code changes yet.

## Tasks
- Auth wiring: integrate Replit OIDC (`setupAuth`, `isAuthenticated`) and replace `createdBy: "system"` with authenticated user IDs.
- Error handling: standardize API error envelope (reuse `createErrorResponse`) and remove rethrow in server/index global handler.
- Seeding: fix `init-database` reference (missing `seed-vedic-data`), reuse `seed-vedic-curriculum` without `process.exit`, and align connection config.
- Published safety: block deletes/updates on published chapters; add guard in storage + routes.
- Validation & invariants: enforce `SCRIPTS` for segments, validate segment bounds vs content length, and ensure ordering moves are transactional.
- Ordering: wrap track/chapter/segment reorder + mapping bulk ops in transactions; prevent duplicate/invalid orders.
- Media & uploads: validate mimetypes/extensions, store duration/mime, and delete files when DB rows are removed.
- Mappings: avoid duplicate media segments per timestamp, consider uniqueness per text+audio, and handle partial deletes atomically.
- N+1/perf: aggregate counts for tracks/chapters instead of per-row queries; cache initialization instead of per-call ensureInitialized.
- User upsert: update conflict set to include roles/status/names; enforce allowed-role list.
- Student progress: implement real queries or return 501 instead of stubbed zeros.
- Monitoring: either hook `DatabaseMonitor` into storage or remove unused monitor exports.
- Schema/constraints: consider uniqueness for segment order (chapter+script) and media/mapping uniqueness; add published guard constraints if desired.
- Cleanup deprecated helpers: remove legacy text-segmentation utilities that don’t match current schema.

## Notes
Keep this list in sync with future backend changes; prioritize auth and data integrity first when ready.
