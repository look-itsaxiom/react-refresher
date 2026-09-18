Build the `steps` array in three passes rather than trying to interleave
everything in one loop: (1) push the `extract-layout` step first, if
needed; (2) build a *reordered* list of routes — every non-auth route
first (in original order), then every auth route (in original order) —
and walk that reordered list, not `app.routes` directly; (3) for each route
in that walk, push its `migrate-route` step, then immediately check if it
needs a `convert-data-loading` step and push that right after.

---

The reorder in step (2) is just two `filter` calls concatenated:
`[...routes.filter(r => !r.auth), ...routes.filter(r => r.auth)]`. `filter`
preserves relative order within each group, which is exactly what "never
let an authenticated route come first" needs — you don't have to write a
custom sort or comparator.

---

`risks` is independent of the exact wording the checks look for — they
check with a case-insensitive substring match for `auth`, and separately
for something like `loader` or `data` in the data-loading risk. Write
real, useful sentences (this is a lesson exercise, not a puzzle to
game) and they'll satisfy the checks naturally.

---

Full shape:

```ts
export function planMigration(app, target) {
  const steps = [];
  const risks = [];

  const layoutPaths = app.routes.filter((r) => r.sharedLayout).map((r) => r.path);
  if (layoutPaths.length > 0) {
    steps.push({ kind: 'extract-layout', routes: layoutPaths, note: '...' });
    risks.push('Shared layout must be extracted and verified before route migration.');
  }

  const ordered = [
    ...app.routes.filter((r) => !r.auth),
    ...app.routes.filter((r) => r.auth),
  ];

  for (const route of ordered) {
    steps.push({ kind: 'migrate-route', routes: [route.path], note: `Migrate ${route.path}.` });
    if (route.dataSource === 'client-fetch') {
      steps.push({ kind: 'convert-data-loading', routes: [route.path], note: `Convert ${route.path} to a loader.` });
    }
  }

  if (app.routes.some((r) => r.auth)) risks.push('Authenticated routes migrate last; verify auth handling.');
  if (app.routes.some((r) => r.dataSource === 'client-fetch')) risks.push('Verify each loader/RSC data conversion.');

  return { steps, risks };
}
```
