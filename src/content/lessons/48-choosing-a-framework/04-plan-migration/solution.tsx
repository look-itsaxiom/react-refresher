export type DataSource = 'client-fetch' | 'none';

export type Route = {
  path: string;
  auth: boolean;
  dataSource: DataSource;
  sharedLayout: boolean;
};

export type AppDescription = {
  name: string;
  routes: Route[];
};

export type Target = 'react-router-framework' | 'nextjs' | 'tanstack-start';

export type MigrationStep = {
  kind: 'extract-layout' | 'migrate-route' | 'convert-data-loading';
  routes: string[];
  note: string;
};

export type MigrationPlan = {
  steps: MigrationStep[];
  risks: string[];
};

function dataLoadingNote(target: Target): string {
  switch (target) {
    case 'nextjs':
      return 'convert client fetch to a Server Component fetch or Route Handler';
    case 'react-router-framework':
      return 'convert client fetch to a route loader';
    case 'tanstack-start':
      return 'convert client fetch to a router loader / createServerFn call';
  }
}

export function planMigration(app: AppDescription, target: Target): MigrationPlan {
  const steps: MigrationStep[] = [];
  const risks: string[] = [];

  const layoutRoutes = app.routes.filter((r) => r.sharedLayout).map((r) => r.path);
  if (layoutRoutes.length > 0) {
    steps.push({
      kind: 'extract-layout',
      routes: layoutRoutes,
      note: 'Extract the shared nav/layout into a root layout before migrating individual routes.',
    });
    risks.push('Shared layout extraction must land and be verified before any route migration begins.');
  }

  const publicRoutes = app.routes.filter((r) => !r.auth);
  const authRoutes = app.routes.filter((r) => r.auth);

  for (const route of [...publicRoutes, ...authRoutes]) {
    steps.push({
      kind: 'migrate-route',
      routes: [route.path],
      note: `Migrate ${route.path} to ${target}.`,
    });
    if (route.dataSource === 'client-fetch') {
      steps.push({
        kind: 'convert-data-loading',
        routes: [route.path],
        note: `${route.path}: ${dataLoadingNote(target)}.`,
      });
    }
  }

  if (authRoutes.length > 0) {
    risks.push('Authenticated routes migrate last; verify session/auth handling before cutover.');
  }
  if (app.routes.some((r) => r.dataSource === 'client-fetch')) {
    risks.push('Data-loading conversions (client fetch to loader/RSC) need per-route verification for caching and error behavior.');
  }

  return { steps, risks };
}

const sampleApp: AppDescription = {
  name: 'react-refresher-app',
  routes: [
    { path: '/about', auth: false, dataSource: 'none', sharedLayout: true },
    { path: '/dashboard', auth: true, dataSource: 'client-fetch', sharedLayout: true },
    { path: '/login', auth: false, dataSource: 'client-fetch', sharedLayout: false },
  ],
};

export default function App() {
  const plan = planMigration(sampleApp, 'react-router-framework');
  return (
    <div style={{ fontFamily: 'sans-serif', padding: 16 }}>
      <h3>Steps</h3>
      <ol>
        {plan.steps.map((s, i) => (
          <li key={i}>
            [{s.kind}] {s.routes.join(', ')} — {s.note}
          </li>
        ))}
      </ol>
      <h3>Risks</h3>
      <ul>
        {plan.risks.map((r, i) => (
          <li key={i}>{r}</li>
        ))}
      </ul>
    </div>
  );
}
