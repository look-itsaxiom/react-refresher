import type { Check } from '../../../types';

type RouteAuth = 'public' | 'user' | { roles: string[] };
type Route = { path: string; auth: RouteAuth };
type Session = { userId: string; roles: string[] } | null;
type Decision = { kind: 'allow' } | { kind: 'redirect'; to: string } | { kind: 'forbidden' };
type Layer = 'middleware' | 'layout' | 'serverFunction';
type Request = { path: string; requiresAuth: boolean };
type Policy = { checksIn: Layer[] };
type ServerCheckResult = { mustReverifyIn: Layer[]; sufficient: boolean; warning?: string };

type Mod = {
  guardPlan: (routes: Route[], session: Session) => Record<string, Decision>;
  serverChecks: (request: Request, session: Session, policy: Policy) => ServerCheckResult;
};

const routes: Route[] = [
  { path: '/', auth: 'public' },
  { path: '/account', auth: 'user' },
  { path: '/admin/users', auth: { roles: ['admin', 'owner'] } },
];

export const checks: Check[] = [
  {
    name: 'guardPlan: a public route always allows, session or not',
    run: async ({ mod, expect }) => {
      const { guardPlan } = mod as unknown as Mod;
      const anon = guardPlan(routes, null);
      const authed = guardPlan(routes, { userId: 'u1', roles: [] });
      expect(anon['/']).to.deep.equal({ kind: 'allow' });
      expect(authed['/']).to.deep.equal({ kind: 'allow' });
    },
  },
  {
    name: 'guardPlan: a "user" route redirects an anonymous visitor with an encoded next',
    run: async ({ mod, expect }) => {
      const { guardPlan } = mod as unknown as Mod;
      const plan = guardPlan(routes, null);
      expect(plan['/account']).to.deep.equal({ kind: 'redirect', to: '/login?next=%2Faccount' });
    },
  },
  {
    name: 'guardPlan: a "user" route allows any logged-in session',
    run: async ({ mod, expect }) => {
      const { guardPlan } = mod as unknown as Mod;
      const plan = guardPlan(routes, { userId: 'u1', roles: [] });
      expect(plan['/account']).to.deep.equal({ kind: 'allow' });
    },
  },
  {
    name: 'guardPlan: a role-gated route redirects (not forbids) an anonymous visitor',
    run: async ({ mod, expect }) => {
      const { guardPlan } = mod as unknown as Mod;
      const plan = guardPlan(routes, null);
      expect(plan['/admin/users']).to.deep.equal({ kind: 'redirect', to: '/login?next=%2Fadmin%2Fusers' });
    },
  },
  {
    name: 'guardPlan: a role-gated route forbids a session missing every listed role',
    run: async ({ mod, expect }) => {
      const { guardPlan } = mod as unknown as Mod;
      const plan = guardPlan(routes, { userId: 'u1', roles: ['member'] });
      expect(plan['/admin/users']).to.deep.equal({ kind: 'forbidden' });
    },
  },
  {
    name: 'guardPlan: a role-gated route allows a session sharing at least one listed role',
    run: async ({ mod, expect }) => {
      const { guardPlan } = mod as unknown as Mod;
      const plan = guardPlan(routes, { userId: 'u1', roles: ['owner'] });
      expect(plan['/admin/users']).to.deep.equal({ kind: 'allow' });
    },
  },
  {
    name: 'serverChecks: a route that does not require auth is trivially sufficient',
    run: async ({ mod, expect }) => {
      const { serverChecks } = mod as unknown as Mod;
      const result = serverChecks({ path: '/public', requiresAuth: false }, null, { checksIn: [] });
      expect(result.sufficient).to.equal(true);
      expect(result.mustReverifyIn).to.deep.equal([]);
      expect(result.warning).to.equal(undefined);
    },
  },
  {
    name: 'serverChecks: middleware-only auth checks are insufficient and warn about CVE-2025-29927',
    run: async ({ mod, expect }) => {
      const { serverChecks } = mod as unknown as Mod;
      const result = serverChecks({ path: '/admin', requiresAuth: true }, { userId: 'u1', roles: ['admin'] }, {
        checksIn: ['middleware'],
      });
      expect(result.sufficient).to.equal(false);
      expect(result.mustReverifyIn).to.have.members(['layout', 'serverFunction']);
      expect(result.warning, 'expected a warning naming the CVE').to.match(/CVE-2025-29927/);
    },
  },
  {
    name: 'serverChecks: checking in the layout and the server function is sufficient, no warning',
    run: async ({ mod, expect }) => {
      const { serverChecks } = mod as unknown as Mod;
      const result = serverChecks({ path: '/admin', requiresAuth: true }, { userId: 'u1', roles: ['admin'] }, {
        checksIn: ['middleware', 'layout', 'serverFunction'],
      });
      expect(result.sufficient).to.equal(true);
      expect(result.mustReverifyIn).to.deep.equal([]);
      expect(result.warning).to.equal(undefined);
    },
  },
  {
    name: 'serverChecks: checking only the layout still requires the server function to re-verify',
    run: async ({ mod, expect }) => {
      const { serverChecks } = mod as unknown as Mod;
      const result = serverChecks({ path: '/admin', requiresAuth: true }, { userId: 'u1', roles: ['admin'] }, {
        checksIn: ['layout'],
      });
      expect(result.sufficient).to.equal(false);
      expect(result.mustReverifyIn).to.deep.equal(['serverFunction']);
      expect(result.warning).to.equal(undefined);
    },
  },
];
