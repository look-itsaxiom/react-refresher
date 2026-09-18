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

export function planMigration(app: AppDescription, target: Target): MigrationPlan {
  // TODO: shared layout first (if any), then public routes before
  // authenticated routes, then a convert-data-loading step right after
  // any route whose dataSource is 'client-fetch'. See prompt.md.
  return { steps: [], risks: [] };
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
