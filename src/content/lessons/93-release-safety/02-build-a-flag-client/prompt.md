# Build a feature-flag client

Implement a small, framework-agnostic feature-flag SDK plus a React binding for it, in
`App.tsx`.

## `createFlagClient`

```ts
type FlagRule = { if: Record<string, string | number | boolean>; serve: boolean };
type FlagDefinition = {
  key: string;
  defaultValue: boolean;
  rules?: FlagRule[];
  rollout?: { percentage: number; salt?: string };
  killSwitch?: boolean;
};
type EvalContext = { userId: string; attributes?: Record<string, string | number | boolean> };
type EvalReason = 'kill-switch' | 'rule' | 'rollout' | 'default' | 'missing';
type EvalResult = { value: boolean; reason: EvalReason };

function createFlagClient(config: { flags: FlagDefinition[]; context: EvalContext }): {
  evaluate: (key: string) => EvalResult;
  update: (context: Partial<EvalContext>) => void;
  subscribe: (listener: () => void) => () => void;
};
```

`evaluate(key)` applies this precedence, in order, stopping at the first that applies:

1. **Kill switch**: if `killSwitch: true`, return `{ value: false, reason: 'kill-switch' }`
   immediately — this overrides rules and rollout.
2. **Rules**: walk `rules` in array order; the first rule whose `if` entries *all* equal
   the corresponding value in the current context's `attributes` wins. Return
   `{ value: rule.serve, reason: 'rule' }`. A rule with no matching attribute (context is
   missing that key) does not match.
3. **Rollout**: if `rollout` is set, compute a bucket with 32-bit FNV-1a:
   `fnv1a(\`${key}:${salt}:${context.userId}\`) % 100 < percentage`, where `salt` defaults
   to `'v1'` when omitted. Return `{ value: true, reason: 'rollout' }` if the user is in
   the bucket, otherwise `{ value: false, reason: 'rollout' }` — the rollout is a
   deliberate decision either way, not a fallthrough.
4. **Default**: return `{ value: defaultValue, reason: 'default' }`.
5. **Missing**: if no flag with that key exists in `flags`, return
   `{ value: false, reason: 'missing' }`.

Implement 32-bit FNV-1a yourself (offset basis `0x811c9dc5`, prime `0x01000193`, using
`Math.imul` and `>>> 0` to stay in unsigned 32-bit range — same algorithm as the concept
step). `update(context)` merges into the current context and notifies subscribers.
`subscribe(listener)` registers a listener called after every `update`, returning an
unsubscribe function.

## `FlagProvider` / `useFlag`

```ts
function FlagProvider(props: { client: ReturnType<typeof createFlagClient>; children: React.ReactNode }): React.ReactElement;
function useFlag(key: string): EvalResult;
```

`useFlag` reads the current evaluation for `key` from the nearest `FlagProvider` and
re-renders the component whenever `client.update(...)` changes the result (subscribe to
the client; don't poll).

Export `createFlagClient`, `fnv1a`, `FlagProvider`, and `useFlag` from `App.tsx`. Render a
small default `App` component that uses `useFlag` to show something on screen (anything
reasonable — the checks only inspect the exported functions and a rendered
`FlagProvider`/`useFlag` pair).
