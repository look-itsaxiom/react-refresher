import { waitFor } from '@testing-library/dom';
import type { Check } from '../../../types';

type PlatformOS = 'web' | 'ios' | 'android';

type PluginImplementations<T> = {
  web: () => T | Promise<T>;
  native?: () => T;
};

type Bridge = {
  platform: PlatformOS;
  fallbacks: string[];
  setPlatform: (p: PlatformOS) => void;
};

type Mod = {
  bridge: Bridge;
  registerPlugin: <T extends object>(name: string, impls: PluginImplementations<T>) => T;
  useCapability: <T extends object>(
    plugin: T,
    method: keyof T & string,
  ) => { available: boolean; call: (...args: unknown[]) => unknown };
};

type EchoPlugin = {
  ping: (msg: string) => Promise<string>;
  other: () => Promise<string>;
  missing?: () => Promise<string>;
};

export const checks: Check[] = [
  {
    name: 'the web implementation is loaded lazily, and only once, no matter how many methods are called',
    run: async (ctx) => {
      const { mod, expect } = ctx;
      const { registerPlugin } = mod as unknown as Mod;

      let webLoads = 0;
      const plugin = registerPlugin<EchoPlugin>('Echo', {
        web: () => {
          webLoads += 1;
          return {
            ping: async (msg: string) => `web:${msg}`,
            other: async () => 'web:other',
          };
        },
      });

      expect(webLoads).to.equal(0);
      expect(await plugin.ping('hi')).to.equal('web:hi');
      expect(await plugin.other()).to.equal('web:other');
      expect(await plugin.ping('again')).to.equal('web:again');
      expect(webLoads).to.equal(1);
    },
  },
  {
    name: 'on a native platform, a native implementation is used instead of the web one when it has the method',
    run: async (ctx) => {
      const { mod, expect } = ctx;
      const { registerPlugin, bridge } = mod as unknown as Mod;

      let webLoads = 0;
      const plugin = registerPlugin<EchoPlugin>('Echo', {
        web: () => {
          webLoads += 1;
          return { ping: async (msg: string) => `web:${msg}`, other: async () => 'web:other' };
        },
        native: () => ({ ping: async (msg: string) => `native:${msg}`, other: async () => 'native:other' }),
      });

      bridge.setPlatform('ios');
      expect(await plugin.ping('hi')).to.equal('native:hi');
      expect(webLoads).to.equal(0);
    },
  },
  {
    name: "a native implementation missing a method falls back to web and records the fallback as 'Plugin.method'",
    run: async (ctx) => {
      const { mod, expect } = ctx;
      const { registerPlugin, bridge } = mod as unknown as Mod;

      const plugin = registerPlugin<EchoPlugin>('Echo', {
        web: () => ({ ping: async (msg: string) => `web:${msg}`, other: async () => 'web:other' }),
        native: () => ({ other: async () => 'native:other' }) as unknown as EchoPlugin,
      });

      bridge.setPlatform('android');
      expect(await plugin.ping('hi')).to.equal('web:hi');
      expect(bridge.fallbacks).to.include('Echo.ping');

      // the method the native impl *does* have should not be recorded as a fallback
      expect(await plugin.other()).to.equal('native:other');
      expect(bridge.fallbacks).to.not.include('Echo.other');
    },
  },
  {
    name: 'calling a method no implementation provides rejects with an UNIMPLEMENTED error code',
    run: async (ctx) => {
      const { mod, expect } = ctx;
      const { registerPlugin } = mod as unknown as Mod;

      const plugin = registerPlugin<EchoPlugin>('Echo', {
        web: () => ({ ping: async (msg: string) => `web:${msg}`, other: async () => 'web:other' }),
      });

      let caught: unknown;
      try {
        await (plugin.missing as unknown as () => Promise<string>)();
      } catch (err) {
        caught = err;
      }

      expect(caught).to.be.instanceOf(Error);
      expect((caught as Error & { code?: string }).code).to.equal('UNIMPLEMENTED');
    },
  },
  {
    name: "useCapability reports available correctly for a present method and a missing one, without invoking either",
    run: async (ctx) => {
      const { mod, render, screen, expect } = ctx;
      const { registerPlugin, useCapability } = mod as unknown as Mod;

      let pingCalls = 0;
      const plugin = registerPlugin<EchoPlugin>('Echo', {
        web: () => ({
          ping: async (msg: string) => {
            pingCalls += 1;
            return `web:${msg}`;
          },
          other: async () => 'web:other',
        }),
      });

      function Probe() {
        const present = useCapability(plugin, 'ping');
        const missing = useCapability(plugin, 'missing');
        return (
          <div>
            <span data-testid="present">{String(present.available)}</span>
            <span data-testid="missing">{String(missing.available)}</span>
          </div>
        );
      }

      render(<Probe />);

      await waitFor(() => {
        expect(screen.getByTestId('present').textContent).to.equal('true');
      });
      expect(screen.getByTestId('missing').textContent).to.equal('false');
      expect(pingCalls).to.equal(0);
    },
  },
];
