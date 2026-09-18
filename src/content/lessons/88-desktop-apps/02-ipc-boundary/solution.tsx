import { useState } from 'react';

export type Handlers = Record<string, (...args: any[]) => unknown>;

export type Bridge = {
  main: { handlers: Handlers };
  renderer: { invoke: (channel: string, ...args: unknown[]) => Promise<unknown> };
};

export function createBridge(config: { handlers: Handlers; allowlist: string[] }): Bridge {
  const allowed = new Set(config.allowlist);

  return {
    main: { handlers: config.handlers },
    renderer: {
      async invoke(channel: string, ...args: unknown[]) {
        const isOwnHandler = Object.prototype.hasOwnProperty.call(config.handlers, channel);
        if (!isOwnHandler || !allowed.has(channel)) {
          throw new Error(`Blocked channel: ${channel}`);
        }

        const clonedArgs = args.map((arg) => structuredClone(arg));
        const handler = config.handlers[channel]!;
        const result = await handler(...clonedArgs);
        return structuredClone(result);
      },
    },
  };
}

export function expose<T extends Record<string, (...args: any[]) => unknown>>(api: T): Readonly<T> {
  const copy = {} as T;
  for (const key of Object.keys(api) as (keyof T)[]) {
    if (typeof api[key] === 'function') {
      copy[key] = api[key];
    }
  }
  return Object.freeze(copy);
}

export function guardNavigation(url: string, options: { allowedOrigins: string[] }): 'allow' | 'open-external' | 'deny' {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return 'deny';
  }

  if (options.allowedOrigins.includes(parsed.origin)) {
    return 'allow';
  }
  if (parsed.protocol === 'https:') {
    return 'open-external';
  }
  return 'deny';
}

const bridge = createBridge({
  handlers: {
    whoami: () => ({ user: 'ada', role: 'admin' }),
  },
  allowlist: ['whoami'],
});

const api = expose({
  whoami: () => bridge.renderer.invoke('whoami'),
});

const samples = [
  { url: 'https://app.example.com/dashboard', label: 'app origin' },
  { url: 'https://evil.example.net/', label: 'other https origin' },
  { url: 'file:///etc/passwd', label: 'file URL' },
];

export default function App() {
  const [who, setWho] = useState<unknown>(null);

  return (
    <div style={{ fontFamily: 'sans-serif', padding: 16 }}>
      <h3>IPC boundary demo</h3>
      <button
        onClick={async () => {
          setWho(await api.whoami());
        }}
      >
        Call whoami
      </button>
      {who !== null && <p data-testid="whoami">{JSON.stringify(who)}</p>}
      <ul>
        {samples.map((s) => (
          <li key={s.url} data-testid={`nav-${s.label}`}>
            {s.label}: {guardNavigation(s.url, { allowedOrigins: ['https://app.example.com'] })}
          </li>
        ))}
      </ul>
    </div>
  );
}
