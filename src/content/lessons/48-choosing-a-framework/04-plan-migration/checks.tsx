import type { Check } from '../../../types';

type DataSource = 'client-fetch' | 'none';

type Route = {
  path: string;
  auth: boolean;
  dataSource: DataSource;
  sharedLayout: boolean;
};

type AppDescription = { name: string; routes: Route[] };
type Target = 'react-router-framework' | 'nextjs' | 'tanstack-start';

type MigrationStep = {
  kind: 'extract-layout' | 'migrate-route' | 'convert-data-loading';
  routes: string[];
  note: string;
};

type MigrationPlan = { steps: MigrationStep[]; risks: string[] };

type Mod = {
  planMigration: (app: AppDescription, target: Target) => MigrationPlan;
};

function migrateStepIndex(plan: MigrationPlan, path: string): number {
  return plan.steps.findIndex((s) => s.kind === 'migrate-route' && s.routes.includes(path));
}

function dataStepIndex(plan: MigrationPlan, path: string): number {
  return plan.steps.findIndex((s) => s.kind === 'convert-data-loading' && s.routes.includes(path));
}

export const checks: Check[] = [
  {
    name: 'extracts the shared layout first, then migrates public routes before authenticated ones, with data-loading steps right after their route',
    run: (ctx) => {
      const { mod, expect } = ctx;
      const { planMigration } = mod as unknown as Mod;

      const app: AppDescription = {
        name: 'demo',
        routes: [
          { path: '/login', auth: false, dataSource: 'none', sharedLayout: true },
          { path: '/about', auth: false, dataSource: 'none', sharedLayout: true },
          { path: '/dashboard', auth: true, dataSource: 'client-fetch', sharedLayout: true },
          { path: '/settings', auth: true, dataSource: 'client-fetch', sharedLayout: true },
        ],
      };

      const plan = planMigration(app, 'react-router-framework');

      const firstStep = plan.steps[0]!;
      expect(firstStep.kind).to.equal('extract-layout');
      expect(new Set(firstStep.routes)).to.deep.equal(new Set(['/login', '/about', '/dashboard', '/settings']));

      const loginIdx = migrateStepIndex(plan, '/login');
      const aboutIdx = migrateStepIndex(plan, '/about');
      const dashboardIdx = migrateStepIndex(plan, '/dashboard');
      const settingsIdx = migrateStepIndex(plan, '/settings');

      [loginIdx, aboutIdx, dashboardIdx, settingsIdx].forEach((idx) =>
        expect(idx, 'expected a migrate-route step for every route').to.be.greaterThan(-1),
      );

      // public routes (login, about) before authenticated routes (dashboard, settings)
      expect(loginIdx).to.be.lessThan(dashboardIdx);
      expect(loginIdx).to.be.lessThan(settingsIdx);
      expect(aboutIdx).to.be.lessThan(dashboardIdx);
      expect(aboutIdx).to.be.lessThan(settingsIdx);
      // relative order preserved within each group
      expect(loginIdx).to.be.lessThan(aboutIdx);
      expect(dashboardIdx).to.be.lessThan(settingsIdx);

      // data-loading steps immediately follow their route's migrate-route step
      const dashboardDataIdx = dataStepIndex(plan, '/dashboard');
      const settingsDataIdx = dataStepIndex(plan, '/settings');
      expect(dashboardDataIdx).to.equal(dashboardIdx + 1);
      expect(settingsDataIdx).to.equal(settingsIdx + 1);

      // routes with no client-fetch data source get no conversion step
      expect(dataStepIndex(plan, '/login')).to.equal(-1);
      expect(dataStepIndex(plan, '/about')).to.equal(-1);
    },
  },
  {
    name: 'an authenticated route is never the first migrate-route step when an unauthenticated route exists, even with no shared layout',
    run: (ctx) => {
      const { mod, expect } = ctx;
      const { planMigration } = mod as unknown as Mod;

      const app: AppDescription = {
        name: 'demo',
        routes: [
          { path: '/public1', auth: false, dataSource: 'client-fetch', sharedLayout: false },
          { path: '/private1', auth: true, dataSource: 'none', sharedLayout: false },
          { path: '/public2', auth: false, dataSource: 'none', sharedLayout: false },
        ],
      };

      const plan = planMigration(app, 'tanstack-start');

      expect(plan.steps.some((s) => s.kind === 'extract-layout')).to.equal(false);

      const firstMigrateStep = plan.steps.find((s) => s.kind === 'migrate-route')!;
      expect(firstMigrateStep.routes).to.not.include('/private1');

      const public1Idx = migrateStepIndex(plan, '/public1');
      const public2Idx = migrateStepIndex(plan, '/public2');
      const private1Idx = migrateStepIndex(plan, '/private1');

      expect(public1Idx).to.be.lessThan(private1Idx);
      expect(public2Idx).to.be.lessThan(private1Idx);
      expect(public1Idx).to.be.lessThan(public2Idx);

      // /public1 has client-fetch: gets a conversion step right after its migrate step
      expect(dataStepIndex(plan, '/public1')).to.equal(public1Idx + 1);
      // /private1 and /public2 have no client-fetch data source
      expect(dataStepIndex(plan, '/private1')).to.equal(-1);
      expect(dataStepIndex(plan, '/public2')).to.equal(-1);
    },
  },
  {
    name: 'risks mention auth, data-loading conversion, and the shared layout when each applies',
    run: (ctx) => {
      const { mod, expect } = ctx;
      const { planMigration } = mod as unknown as Mod;

      const app: AppDescription = {
        name: 'demo',
        routes: [
          { path: '/home', auth: false, dataSource: 'none', sharedLayout: true },
          { path: '/account', auth: true, dataSource: 'client-fetch', sharedLayout: true },
        ],
      };

      const plan = planMigration(app, 'nextjs');
      const risksText = plan.risks.join(' ').toLowerCase();

      expect(risksText).to.match(/auth/);
      expect(risksText).to.match(/loader|rsc|data.?load/);
      expect(risksText).to.match(/layout/);
    },
  },
  {
    name: 'with no auth routes, no client-fetch data, and no shared layout, the plan is just migrate-route steps in original order and risks stay minimal',
    run: (ctx) => {
      const { mod, expect } = ctx;
      const { planMigration } = mod as unknown as Mod;

      const app: AppDescription = {
        name: 'demo',
        routes: [
          { path: '/a', auth: false, dataSource: 'none', sharedLayout: false },
          { path: '/b', auth: false, dataSource: 'none', sharedLayout: false },
        ],
      };

      const plan = planMigration(app, 'react-router-framework');

      expect(plan.steps.every((s) => s.kind === 'migrate-route')).to.equal(true);
      expect(plan.steps.map((s) => s.routes[0])).to.deep.equal(['/a', '/b']);

      const risksText = plan.risks.join(' ').toLowerCase();
      expect(risksText).to.not.match(/auth/);
      expect(risksText).to.not.match(/layout/);
    },
  },
];
