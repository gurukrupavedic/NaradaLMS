# Narada web

The Next.js frontend for `apps/api`. The pre-rewrite frontend has been removed; it remains in Git
history (`git show 9a35fcdc:apps/web-legacy/…`).

Part of the root pnpm workspace (shared lockfile, shared `node_modules`).

## Run locally

From the repository root:

```bash
pnpm install
pnpm web:dev
```

Then open [http://localhost:3000](http://localhost:3000).

## Coming-soon mode

Set `COMING_SOON_MODE=true` on a deployment to front every page with the maintenance page (`proxy.ts`).
`/v1/*` (the API and auth) is never gated by it.

To let the team through, also set a long random `PREVIEW_PASSWORD` (server-only — never `NEXT_PUBLIC_`).
The maintenance page then shows a "Team access" form; entering the password sets a 30-day cookie and the
person sees the app as normal, still needing to sign in. Rotating the password signs everyone out of
the preview. With `PREVIEW_PASSWORD` unset the form doesn't exist. This is temporary — see
`lib/preview-unlock.ts` for what to delete at launch.
