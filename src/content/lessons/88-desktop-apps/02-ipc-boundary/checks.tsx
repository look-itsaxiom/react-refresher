import type { Check } from '../../../types';

type Handlers = Record<string, (...args: any[]) => unknown>;

type Bridge = {
  main: { handlers: Handlers };
  renderer: { invoke: (channel: string, ...args: unknown[]) => Promise<unknown> };
};

type Mod = {
  createBridge: (config: { handlers: Handlers; allowlist: string[] }) => Bridge;
  expose: <T extends Record<string, (...args: any[]) => unknown>>(api: T) => Readonly<T>;
  guardNavigation: (url: string, options: { allowedOrigins: string[] }) => 'allow' | 'open-external' | 'deny';
};

async function rejects(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (err) {
    return err;
  }
  throw new Error('expected promise to reject, but it resolved');
}

export const checks: Check[] = [
  {
    name: 'invoke resolves through an allowed channel, and rejects for any channel not both a real handler and on the allowlist',
    run: async (ctx) => {
      const { mod, expect } = ctx;
      const { createBridge } = mod as unknown as Mod;

      const { renderer } = createBridge({
        handlers: {
          ping: (n: number) => n + 1,
          secret: () => 'nope',
        },
        allowlist: ['ping'],
      });

      expect(await renderer.invoke('ping', 41)).to.equal(42);

      const blockedSecret = (await rejects(renderer.invoke('secret'))) as Error;
      expect(blockedSecret.message).to.equal('Blocked channel: secret');

      const blockedMissing = (await rejects(renderer.invoke('missing'))) as Error;
      expect(blockedMissing.message).to.equal('Blocked channel: missing');

      // a channel literally named "__proto__" is just an ordinary disallowed string
      const blockedProto = (await rejects(renderer.invoke('__proto__', { polluted: true }))) as Error;
      expect(blockedProto.message).to.equal('Blocked channel: __proto__');
    },
  },
  {
    name: 'arguments are cloned before the handler sees them, so mutating the original after calling invoke has no effect',
    run: async (ctx) => {
      const { mod, expect } = ctx;
      const { createBridge } = mod as unknown as Mod;

      let sawValue: number | undefined;
      const { renderer } = createBridge({
        handlers: {
          echo: (obj: { value: number }) => {
            sawValue = obj.value;
            return { received: obj.value };
          },
        },
        allowlist: ['echo'],
      });

      const original = { value: 1 };
      const promise = renderer.invoke('echo', original);
      original.value = 999; // mutate synchronously, before awaiting

      const result = (await promise) as { received: number };
      expect(sawValue).to.equal(1);
      expect(result.received).to.equal(1);
    },
  },
  {
    name: "results are cloned before the renderer sees them, so mutating the resolved value never mutates main's state",
    run: async (ctx) => {
      const { mod, expect } = ctx;
      const { createBridge } = mod as unknown as Mod;

      const state = { count: 0 };
      const { renderer } = createBridge({
        handlers: { getState: () => state },
        allowlist: ['getState'],
      });

      const first = (await renderer.invoke('getState')) as { count: number };
      first.count = 999;

      const second = (await renderer.invoke('getState')) as { count: number };
      expect(second.count).to.equal(0);
      expect(state.count).to.equal(0);
    },
  },
  {
    name: 'a function argument rejects the invoke call, the same way any other unclonable value would',
    run: async (ctx) => {
      const { mod, expect } = ctx;
      const { createBridge } = mod as unknown as Mod;

      const { renderer } = createBridge({
        handlers: { run: (fn: () => number) => fn() },
        allowlist: ['run'],
      });

      const err = await rejects(renderer.invoke('run', () => 1));
      expect(err).to.be.instanceOf(Error);
    },
  },
  {
    name: 'expose returns a frozen object exposing only the given methods; assigning to it never changes it',
    run: (ctx) => {
      const { mod, expect } = ctx;
      const { expose } = mod as unknown as Mod;

      const exposed = expose({ ping: () => 'pong' });
      expect(Object.isFrozen(exposed)).to.equal(true);
      expect(exposed.ping()).to.equal('pong');

      try {
        (exposed as unknown as Record<string, unknown>).extra = 'sneaky';
      } catch {
        // strict-mode assignment to a frozen object throws — that's fine too
      }
      expect((exposed as unknown as Record<string, unknown>).extra).to.equal(undefined);

      try {
        (exposed as unknown as Record<string, unknown>).ping = () => 'hijacked';
      } catch {
        // same here
      }
      expect(exposed.ping()).to.equal('pong');
    },
  },
  {
    name: 'guardNavigation allows same-origin, sends other https origins to open-external, and denies everything else',
    run: (ctx) => {
      const { mod, expect } = ctx;
      const { guardNavigation } = mod as unknown as Mod;
      const allowedOrigins = ['https://app.example.com'];

      expect(guardNavigation('https://app.example.com/dashboard', { allowedOrigins })).to.equal('allow');
      expect(guardNavigation('https://evil.example.net/', { allowedOrigins })).to.equal('open-external');
      expect(guardNavigation('http://app.example.com/', { allowedOrigins })).to.equal('deny');
      expect(guardNavigation('file:///etc/passwd', { allowedOrigins })).to.equal('deny');
      expect(guardNavigation('javascript:alert(1)', { allowedOrigins })).to.equal('deny');
      expect(guardNavigation('data:text/html,<script>1</script>', { allowedOrigins })).to.equal('deny');
      expect(guardNavigation('not a url at all', { allowedOrigins })).to.equal('deny');
    },
  },
];
