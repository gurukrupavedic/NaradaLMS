# Narada web

The current Next.js frontend (promoted from `apps/web-next`, its name during the rewrite —
rethinking Narada's web application from first principles against the new `apps/api`).
`apps/web-legacy` is the pre-rewrite frontend, kept as a fallback while this rewrite is still
settling in.

Part of the root pnpm workspace (shared lockfile, shared `node_modules`) — it was its own
standalone workspace early in the rewrite, before being folded in.

## Run locally

From the repository root:

```bash
pnpm install
pnpm web:dev
```

Then open [http://localhost:3000](http://localhost:3000).
