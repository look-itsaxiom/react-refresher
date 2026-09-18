import type { Check } from '../../../types';

type Clock = { log: string[]; record: (e: string) => void; tick: () => Promise<void> };
type LoaderFn = (clock: Clock) => Promise<unknown>;
type ActionFn = (clock: Clock) => Promise<unknown>;
type RouteNode = { id: string; path: string; loader?: LoaderFn; action?: ActionFn; children?: RouteNode[] };
type NavigationResult =
  | { ok: true; loaderData: Record<string, unknown> }
  | { ok: false; errorRouteId: string; loaderData: Record<string, unknown> };

export const checks: Check[] = [
  {
    name: 'runNavigation runs matched loaders in parallel, not one after another',
    run: async ({ mod, expect }) => {
      const createClock = mod.createClock as () => Clock;
      const makeLoader = mod.makeLoader as (id: string) => LoaderFn;
      const runNavigation = mod.runNavigation as (t: RouteNode, u: string, c: Clock) => Promise<NavigationResult>;

      const clock = createClock();
      const tree: RouteNode = {
        id: 'root',
        path: '',
        loader: makeLoader('root'),
        children: [{ id: 'child', path: 'child', loader: makeLoader('child') }],
      };
      await runNavigation(tree, '/child', clock);
      expect(clock.log).to.deep.equal(['root:start', 'child:start', 'root:end', 'child:end']);
    },
  },
  {
    name: 'runNavigation returns loaderData keyed by route id for every matched loader',
    run: async ({ mod, expect }) => {
      const createClock = mod.createClock as () => Clock;
      const makeLoader = mod.makeLoader as (id: string) => LoaderFn;
      const runNavigation = mod.runNavigation as (t: RouteNode, u: string, c: Clock) => Promise<NavigationResult>;

      const clock = createClock();
      const tree: RouteNode = {
        id: 'root',
        path: '',
        loader: makeLoader('root'),
        children: [{ id: 'child', path: 'child', loader: makeLoader('child') }],
      };
      const result = await runNavigation(tree, '/child', clock);
      expect(result.ok).to.equal(true);
      if (result.ok) {
        expect(result.loaderData.root).to.deep.equal({ id: 'root', calls: 1 });
        expect(result.loaderData.child).to.deep.equal({ id: 'child', calls: 1 });
      }
    },
  },
  {
    name: 'a route with no loader contributes nothing to loaderData',
    run: async ({ mod, expect }) => {
      const createClock = mod.createClock as () => Clock;
      const makeLoader = mod.makeLoader as (id: string) => LoaderFn;
      const runNavigation = mod.runNavigation as (t: RouteNode, u: string, c: Clock) => Promise<NavigationResult>;

      const clock = createClock();
      const tree: RouteNode = {
        id: 'layout',
        path: '',
        children: [{ id: 'page', path: 'page', loader: makeLoader('page') }],
      };
      const result = await runNavigation(tree, '/page', clock);
      expect(result.ok).to.equal(true);
      expect(Object.keys(result.loaderData)).to.deep.equal(['page']);
    },
  },
  {
    name: 'runAction runs the action then revalidates every matched loader',
    run: async ({ mod, expect }) => {
      const createClock = mod.createClock as () => Clock;
      const makeLoader = mod.makeLoader as (id: string) => LoaderFn;
      const makeAction = mod.makeAction as (id: string) => ActionFn;
      const runNavigation = mod.runNavigation as (t: RouteNode, u: string, c: Clock) => Promise<NavigationResult>;
      const runAction = mod.runAction as (
        t: RouteNode,
        u: string,
        actionRouteId: string,
        c: Clock,
      ) => Promise<NavigationResult & { actionData?: unknown }>;

      const clock = createClock();
      const tree: RouteNode = {
        id: 'root',
        path: '',
        children: [{ id: 'shop', path: 'shop', loader: makeLoader('shop'), action: makeAction('shop') }],
      };

      const first = await runNavigation(tree, '/shop', clock);
      expect(first.ok).to.equal(true);
      if (first.ok) expect(first.loaderData.shop).to.deep.equal({ id: 'shop', calls: 1 });

      const afterAction = await runAction(tree, '/shop', 'shop', clock);
      expect(afterAction.actionData).to.deep.equal({ id: 'shop', submitted: true });
      expect(afterAction.ok).to.equal(true);
      if (afterAction.ok) expect(afterAction.loaderData.shop).to.deep.equal({ id: 'shop', calls: 2 });
    },
  },
  {
    name: "when a loader throws, runNavigation reports the failing route's id but keeps sibling data",
    run: async ({ mod, expect }) => {
      const createClock = mod.createClock as () => Clock;
      const makeLoader = mod.makeLoader as (id: string, opts?: { fail?: boolean }) => LoaderFn;
      const runNavigation = mod.runNavigation as (t: RouteNode, u: string, c: Clock) => Promise<NavigationResult>;

      const clock = createClock();
      const tree: RouteNode = {
        id: 'root',
        path: '',
        loader: makeLoader('root'),
        children: [{ id: 'bad', path: 'bad', loader: makeLoader('bad', { fail: true }) }],
      };
      const result = await runNavigation(tree, '/bad', clock);
      expect(result.ok).to.equal(false);
      if (!result.ok) {
        expect(result.errorRouteId).to.equal('bad');
        expect(result.loaderData.root).to.deep.equal({ id: 'root', calls: 1 });
        expect(result.loaderData).to.not.have.property('bad');
      }
    },
  },
];
