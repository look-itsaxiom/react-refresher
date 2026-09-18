export type RouteAuth = 'public' | 'user' | { roles: string[] };
export type Route = { path: string; auth: RouteAuth };
export type Session = { userId: string; roles: string[] } | null;
export type Decision = { kind: 'allow' } | { kind: 'redirect'; to: string } | { kind: 'forbidden' };

export type Layer = 'middleware' | 'layout' | 'serverFunction';
export type Request = { path: string; requiresAuth: boolean };
export type Policy = { checksIn: Layer[] };
export type ServerCheckResult = {
  mustReverifyIn: Layer[];
  sufficient: boolean;
  warning?: string;
};

/** See prompt.md for the exact rules. */
export function guardPlan(routes: Route[], session: Session): Record<string, Decision> {
  // TODO: implement per the prompt.
  return {};
}

/** See prompt.md for the exact rules. */
export function serverChecks(request: Request, session: Session, policy: Policy): ServerCheckResult {
  // TODO: implement per the prompt.
  return { mustReverifyIn: [], sufficient: false };
}

const demoRoutes: Route[] = [
  { path: '/', auth: 'public' },
  { path: '/account', auth: 'user' },
  { path: '/admin', auth: { roles: ['admin'] } },
];
const demoSession: Session = { userId: 'u1', roles: ['member'] };

export default function App() {
  const plan = guardPlan(demoRoutes, demoSession);
  const check = serverChecks({ path: '/admin', requiresAuth: true }, demoSession, { checksIn: ['middleware'] });
  return (
    <div>
      <pre>{JSON.stringify(plan, null, 2)}</pre>
      <pre>{JSON.stringify(check, null, 2)}</pre>
    </div>
  );
}
