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

type Registration<T> = {
  name: string;
  impls: PluginImplementations<T>;
  webPromise?: Promise<T>;
};

const registryByProxy = new WeakMap<object, Registration<unknown>>();

function loadWeb<T>(reg: Registration<T>): Promise<T> {
  if (!reg.webPromise) {
    reg.webPromise = Promise.resolve(reg.impls.web());
  }
  return reg.webPromise;
}

async function resolveMethod<T>(
  reg: Registration<T>,
  method: string,
  recordFallback: boolean,
): Promise<((...args: unknown[]) => unknown) | undefined> {
  if (bridge.platform !== 'web' && reg.impls.native) {
    const nativeImpl = reg.impls.native() as Record<string, unknown>;
    const fn = nativeImpl[method];
    if (typeof fn === 'function') {
      return fn.bind(nativeImpl) as (...args: unknown[]) => unknown;
    }
    if (recordFallback) {
      bridge.fallbacks.push(`${reg.name}.${method}`);
    }
  }

  const web = (await loadWeb(reg)) as Record<string, unknown>;
  const fn = web[method];
  return typeof fn === 'function' ? (fn.bind(web) as (...args: unknown[]) => unknown) : undefined;
}

export function registerPlugin<T extends object>(name: string, impls: PluginImplementations<T>): T {
  const reg: Registration<T> = { name, impls };

  const proxy = new Proxy({} as T, {
    get(_target, prop) {
      if (typeof prop !== 'string') return undefined;
      return async (...args: unknown[]) => {
        const fn = await resolveMethod(reg, prop, true);
        if (!fn) {
          const error = new Error(`"${prop}" is not implemented on plugin "${name}"`) as Error & { code: string };
          error.code = 'UNIMPLEMENTED';
          throw error;
        }
        return fn(...args);
      };
    },
  }) as T;

  registryByProxy.set(proxy as object, reg as Registration<unknown>);
  return proxy;
}

export function useCapability<T extends object>(
  plugin: T,
  method: keyof T & string,
): { available: boolean; call: (...args: unknown[]) => unknown } {
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const reg = registryByProxy.get(plugin as object);
    if (!reg) {
      setAvailable(false);
      return;
    }
    resolveMethod(reg, method, false).then((fn) => {
      if (!cancelled) setAvailable(Boolean(fn));
    });
    return () => {
      cancelled = true;
    };
  }, [plugin, method]);

  const call = useCallback(
    (...args: unknown[]) => (plugin[method] as unknown as (...a: unknown[]) => unknown)(...args),
    [plugin, method],
  );

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
