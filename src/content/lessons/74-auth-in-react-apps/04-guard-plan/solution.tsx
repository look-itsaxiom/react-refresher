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

function redirectTo(path: string): Decision {
  return { kind: 'redirect', to: '/login?next=' + encodeURIComponent(path) };
}

export function guardPlan(routes: Route[], session: Session): Record<string, Decision> {
  const result: Record<string, Decision> = {};

  for (const route of routes) {
    if (route.auth === 'public') {
      result[route.path] = { kind: 'allow' };
      continue;
    }

    if (!session) {
      result[route.path] = redirectTo(route.path);
      continue;
    }

    if (route.auth === 'user') {
      result[route.path] = { kind: 'allow' };
      continue;
    }

    const hasRole = route.auth.roles.some((role) => session.roles.includes(role));
    result[route.path] = hasRole ? { kind: 'allow' } : { kind: 'forbidden' };
  }

  return result;
}

export function serverChecks(request: Request, _session: Session, policy: Policy): ServerCheckResult {
  if (!request.requiresAuth) {
    return { mustReverifyIn: [], sufficient: true };
  }

  const essential: Layer[] = ['layout', 'serverFunction'];
  const mustReverifyIn = essential.filter((layer) => !policy.checksIn.includes(layer));
  const sufficient = mustReverifyIn.length === 0;

  const onlyMiddleware =
    policy.checksIn.includes('middleware') &&
    !policy.checksIn.includes('layout') &&
    !policy.checksIn.includes('serverFunction');

  if (onlyMiddleware) {
    return {
      mustReverifyIn,
      sufficient,
      warning:
        'Middleware/proxy checks alone are bypassable (see CVE-2025-29927) — the layout and each server function must re-verify the session too.',
    };
  }

  return { mustReverifyIn, sufficient };
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
