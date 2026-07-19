# Working in this directory

Only reuse patterns that already exist inside `apps/api-next`. Do not port
patterns from `apps/api/src` (the old, pre-rewrite implementation), even when
`src/` already solves a structurally similar problem — cursor pagination,
conditional `where` filters, authorization, etc.

`apps/api/src` is useful as reference for _what a feature needs to do_
(business rules, edge cases it handles), not _how the code should be shaped_.
If the rewrite doesn't yet have a local precedent for something, prefer
the underlying library's own idioms (e.g. Drizzle's
[dynamic query building](https://orm.drizzle.team/docs/dynamic-query-building))
over copying the old codebase's style.

## Feature workflow: plan → execute → adversarial review

When implementing a feature in this directory, use this multi-agent split
rather than doing it all in one pass:

1. **Planning agent** (Sonnet 5, high effort) — breaks the feature down into
   a concrete plan and splits it into one or more units of work.
2. **Execution agent(s)** (Sonnet 5, low effort) — one or more agents,
   each implementing a unit of work from the plan.
3. **Adversarial review agent** (Sonnet 5, high effort) — reviews the
   resulting code critically and reports issues/feedback; it does not fix
   anything itself.

The human reviews both the code and the adversarial agent's feedback,
makes any further edits, and commits — commits are never made
automatically at the end of this pipeline.
