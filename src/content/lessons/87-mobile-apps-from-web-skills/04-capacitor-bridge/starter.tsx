import { useState, useEffect, useCallback } from 'react';

export type PlatformOS = 'web' | 'ios' | 'android';

export type PluginImplementations<T> = {
  web: () => T | Promise<T>;
  native?: () => T;
};

export const bridge = {
  platform: 'web' as PlatformOS,
  fallbacks: [] as string[],
  setPlatform(p: PlatformOS) {
    bridge.platform = p;
  },
};

// TODO: registerPlugin should return a Proxy of type T. Calling any method
// on it should, lazily and at call time:
//   1. If bridge.platform is native ('ios'/'android') and impls.native was
//      given, use impls.native()'s copy of the method if it has one.
//   2. Otherwise (or if that method is missing on the native object — push
//      `${name}.${method}` onto bridge.fallbacks when this happens), fall
//      back to impls.web(), calling it only once ever and reusing the
//      result for every later call.
//   3. If no implementation has the method at all, reject with an Error
//      whose `code` is 'UNIMPLEMENTED'.
export function registerPlugin<T extends object>(name: string, impls: PluginImplementations<T>): T {
  return new Proxy({} as T, {
    get() {
      return async () => {
        throw new Error('not implemented');
      };
    },
  }) as T;
}

// TODO: `available` should become true once the hook determines the
// current platform's resolved implementation has `method` — without
// invoking it. `call` should invoke the method through `plugin`.
export function useCapability<T extends object>(
  plugin: T,
  method: keyof T & string,
): { available: boolean; call: (...args: unknown[]) => unknown } {
  const [available] = useState(false);

  const call = useCallback((...args: unknown[]) => (plugin[method] as unknown as (...a: unknown[]) => unknown)(...args), [plugin, method]);

  return { available, call };
}

type BatteryPlugin = {
  getLevel: () => Promise<{ level: number }>;
};

const battery = registerPlugin<BatteryPlugin>('Battery', {
  web: () => ({ getLevel: async () => ({ level: 1 }) }),
});

export default function App() {
  const { available, call } = useCapability(battery, 'getLevel');
  const [level, setLevel] = useState<number | null>(null);

  return (
    <div style={{ fontFamily: 'sans-serif', padding: 16 }}>
      <p data-testid="available">{available ? 'Battery API available' : 'Battery API unavailable'}</p>
      <button
        onClick={async () => {
          const result = (await call()) as { level: number };
          setLevel(result.level);
        }}
      >
        Check battery
      </button>
      {level !== null && <p data-testid="level">{Math.round(level * 100)}%</p>}
    </div>
  );
}
