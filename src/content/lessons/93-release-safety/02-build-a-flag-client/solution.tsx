import * as React from 'react';

export type FlagRule = { if: Record<string, string | number | boolean>; serve: boolean };
export type FlagDefinition = {
  key: string;
  defaultValue: boolean;
  rules?: FlagRule[];
  rollout?: { percentage: number; salt?: string };
  killSwitch?: boolean;
};
export type EvalContext = { userId: string; attributes?: Record<string, string | number | boolean> };
export type EvalReason = 'kill-switch' | 'rule' | 'rollout' | 'default' | 'missing';
export type EvalResult = { value: boolean; reason: EvalReason };

export function fnv1a(str: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export function createFlagClient(config: { flags: FlagDefinition[]; context: EvalContext }) {
  let context = config.context;
  const flagsByKey = new Map(config.flags.map((f) => [f.key, f]));
  const listeners = new Set<() => void>();

  function evaluate(key: string): EvalResult {
    const flag = flagsByKey.get(key);
    if (!flag) return { value: false, reason: 'missing' };

    if (flag.killSwitch) return { value: false, reason: 'kill-switch' };

    if (flag.rules) {
      const attrs = context.attributes ?? {};
      for (const rule of flag.rules) {
        const matches = Object.entries(rule.if).every(([attrKey, expected]) => attrs[attrKey] === expected);
        if (matches) return { value: rule.serve, reason: 'rule' };
      }
    }

    if (flag.rollout) {
      const salt = flag.rollout.salt ?? 'v1';
      const bucket = fnv1a(`${key}:${salt}:${context.userId}`) % 100;
      return { value: bucket < flag.rollout.percentage, reason: 'rollout' };
    }

    return { value: flag.defaultValue, reason: 'default' };
  }

  function update(partial: Partial<EvalContext>) {
    context = {
      ...context,
      ...partial,
      attributes: { ...context.attributes, ...partial.attributes },
    };
    listeners.forEach((listener) => listener());
  }

  function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  return { evaluate, update, subscribe };
}

const FlagContext = React.createContext<ReturnType<typeof createFlagClient> | null>(null);

export function FlagProvider({
  client,
  children,
}: {
  client: ReturnType<typeof createFlagClient>;
  children: React.ReactNode;
}) {
  return <FlagContext.Provider value={client}>{children}</FlagContext.Provider>;
}

export function useFlag(key: string): EvalResult {
  const client = React.useContext(FlagContext);
  if (!client) throw new Error('useFlag must be used within a FlagProvider');
  const [result, setResult] = React.useState(() => client.evaluate(key));

  React.useEffect(() => {
    setResult(client.evaluate(key));
    const unsubscribe = client.subscribe(() => setResult(client.evaluate(key)));
    return () => {
      unsubscribe();
    };
  }, [client, key]);

  return result;
}

const demoClient = createFlagClient({
  flags: [{ key: 'new-dashboard', defaultValue: false, rollout: { percentage: 50 } }],
  context: { userId: 'demo-user' },
});

function FlagDisplay() {
  const { value, reason } = useFlag('new-dashboard');
  return (
    <div data-testid="flag-result">
      {value ? 'on' : 'off'} ({reason})
    </div>
  );
}

export default function App() {
  return (
    <FlagProvider client={demoClient}>
      <FlagDisplay />
    </FlagProvider>
  );
}
