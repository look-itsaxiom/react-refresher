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

// TODO: implement 32-bit FNV-1a. Offset basis 0x811c9dc5, prime 0x01000193.
export function fnv1a(str: string): number {
  return 0;
}

export function createFlagClient(config: { flags: FlagDefinition[]; context: EvalContext }) {
  let context = config.context;
  const flagsByKey = new Map(config.flags.map((f) => [f.key, f]));
  const listeners = new Set<() => void>();

  function evaluate(key: string): EvalResult {
    // TODO: apply precedence: kill switch -> first matching rule -> rollout -> default -> missing.
    const flag = flagsByKey.get(key);
    if (!flag) return { value: false, reason: 'missing' };
    return { value: flag.defaultValue, reason: 'default' };
  }

  function update(partial: Partial<EvalContext>) {
    // TODO: merge partial into context and notify listeners.
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
  // TODO: subscribe to client updates so this hook re-renders when the evaluation changes.
  return client.evaluate(key);
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
