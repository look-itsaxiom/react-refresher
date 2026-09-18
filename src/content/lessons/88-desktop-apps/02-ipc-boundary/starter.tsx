import { useState } from 'react';

export type Handlers = Record<string, (...args: any[]) => unknown>;

export type Bridge = {
  main: { handlers: Handlers };
  renderer: { invoke: (channel: string, ...args: unknown[]) => Promise<unknown> };
};

// TODO: renderer.invoke(channel, ...args) should:
//   1. Reject with `Error('Blocked channel: ${channel}')` unless `channel` is both an own
//      key of `handlers` AND present in `allowlist`. Don't call the handler otherwise.
//   2. Clone `args` (structuredClone) before the handler sees them.
//   3. Clone the handler's return value before resolving with it.
// A function argument will make structuredClone throw on its own — no extra handling needed.
export function createBridge(config: { handlers: Handlers; allowlist: string[] }): Bridge {
  return {
    main: { handlers: config.handlers },
    renderer: {
      async invoke(_channel: string, ..._args: unknown[]) {
        throw new Error('not implemented');
      },
    },
  };
}

// TODO: return a frozen shallow copy of `api` containing only its own function-valued keys.
export function expose<T extends Record<string, (...args: any[]) => unknown>>(api: T): Readonly<T> {
  return api;
}

// TODO: same-origin (origin is in allowedOrigins) -> 'allow'; https: to another origin ->
// 'open-external'; anything else (http:, file:, javascript:, data:, unparsable) -> 'deny'.
export function guardNavigation(_url: string, _options: { allowedOrigins: string[] }): 'allow' | 'open-external' | 'deny' {
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
