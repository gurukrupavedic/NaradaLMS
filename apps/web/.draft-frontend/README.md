# Narada draft frontend

An isolated Next.js workspace for rethinking Narada's web application from first principles.

## Run locally

```bash
pnpm install
pnpm dev
```

Then open [http://localhost:3000](http://localhost:3000).

Still its own standalone pnpm workspace (own lockfile, own `node_modules`, not linked into the
monorepo's), but now tracked in git as of the `revanth/backend-rewrite` branch.
