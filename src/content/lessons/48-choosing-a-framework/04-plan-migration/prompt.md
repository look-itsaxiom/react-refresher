# Build a migration planner

You're given a description of an existing CSR Vite SPA's routes and a
migration target, and you need to produce an ordered migration plan that
follows the strangler pattern from the concept step: low-risk (public,
unauthenticated) routes move first, shared layout is extracted once up
front, and data-loading conversions are called out per route.

## Types

```ts
type DataSource = 'client-fetch' | 'none';

type Route = {
  path: string;
  auth: boolean; // requires an authenticated session
  dataSource: DataSource; // how the route currently loads data
  sharedLayout: boolean; // renders inside the app's shared nav/layout
};

type App = {
  name: string;
  routes: Route[]; // in their current relative order
};

type Target = 'react-router-framework' | 'nextjs' | 'tanstack-start';

type MigrationStep = {
  kind: 'extract-layout' | 'migrate-route' | 'convert-data-loading';
  routes: string[]; // route paths this step touches
  note: string; // human-readable description
};

type MigrationPlan = {
  steps: MigrationStep[];
  risks: string[];
};

function planMigration(app: App, target: Target): MigrationPlan;
```

## Rules

1. **Shared layout first, if there is one.** If any route has
   `sharedLayout: true`, the *first* step in `steps` has
   `kind: 'extract-layout'` and `routes` listing every path with
   `sharedLayout: true`. If no route uses a shared layout, skip this step
   entirely.

2. **Public routes before authenticated routes, always.** After the
   layout step (if any), add one `kind: 'migrate-route'` step per route.
   Order them so every route with `auth: false` comes before every route
   with `auth: true` — preserve each group's original relative order among
   themselves, but never let an authenticated route's step come before an
   unauthenticated route's step. This is the rule the checks enforce most
   strictly: **an authenticated route's `migrate-route` step must never be
   the first `migrate-route` step in the plan** when any unauthenticated
   route exists.

3. **Data-loading conversion follows its route, immediately.** For every
   route with `dataSource: 'client-fetch'`, add a `kind:
   'convert-data-loading'` step for that same path *directly after* that
   route's `migrate-route` step (mention the target's data primitive —
   `loader` for `'react-router-framework'`/`'tanstack-start'`, a Server
   Component fetch or Route Handler for `'nextjs'`, in `note`; the checks
   only verify the step exists and where it sits, not the exact wording).
   Routes with `dataSource: 'none'` get no such step.

4. **Risks.** Populate `risks: string[]` with at least:
   - one entry mentioning authentication, if any route has `auth: true`;
   - one entry mentioning data-loading conversion (loaders/RSC), if any
     route has `dataSource: 'client-fetch'`;
   - one entry mentioning the shared layout, if any route has
     `sharedLayout: true`.

## Ship something visible

Render a small default `App` that calls `planMigration` with a sample
`App` description and lists the resulting steps and risks, so the preview
shows something.
