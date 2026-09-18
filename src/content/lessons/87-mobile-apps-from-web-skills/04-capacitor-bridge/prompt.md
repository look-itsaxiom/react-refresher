# Build a Capacitor-style plugin bridge

Capacitor itself can't run here — there's no native shell, no real
iOS/Android bridge in this sandbox. What you're building is a **miniature
of Capacitor's plugin model**: a way to register a plugin with a web
implementation and an optional native one, and call it through a single
API that resolves to whichever implementation fits the current platform
— which is the actual problem Capacitor's bridge solves, just without the
real WebView and native binary underneath it.

## What to implement

### `bridge`

A plain object with:

- `platform: 'web' | 'ios' | 'android'` — starts as `'web'`.
- `setPlatform(p)` — changes it.
- `fallbacks: string[]` — every time a call falls back from a missing
  native method to the web implementation (see below), push
  `` `${pluginName}.${methodName}` `` onto this list.

### `registerPlugin<T>(name, { web, native? })`

```ts
function registerPlugin<T extends object>(
  name: string,
  impls: { web: () => T | Promise<T>; native?: () => T },
): T;
```

Returns an object of type `T` — in practice a **proxy** — where calling
any method resolves the right implementation lazily, at call time, based
on `bridge.platform`:

- **Web is loaded once and cached.** `impls.web()` may return a value
  directly or a `Promise` of one; call it the *first* time any method
  needs the web implementation, and reuse that same (awaited) result for
  every later call — never call `impls.web()` a second time for the same
  plugin.
- **Native, when the platform is native and a native impl exists.** If
  `bridge.platform` is `'ios'` or `'android'` and `impls.native` was
  provided, call `impls.native()` and use *its* copy of the method.
- **Fallback.** If the platform is native, `impls.native` exists, but the
  resulting object doesn't have the requested method, fall back to the
  web implementation instead of failing — and record the fallback (see
  `bridge.fallbacks` above).
- **Unimplemented.** If, after all of the above, no implementation has
  the requested method (neither the chosen native object nor the web
  one), the call must reject with an `Error` whose `code` property is
  the string `'UNIMPLEMENTED'`.

Every plugin method call is asynchronous — return a `Promise` (an `async`
function is the simplest way) even if the underlying implementation is
synchronous.

### `useCapability(plugin, method)`

A hook for gating UI on whether a capability actually exists before
offering it:

```ts
function useCapability<T extends object>(
  plugin: T,
  method: keyof T & string,
): { available: boolean; call: (...args: unknown[]) => unknown };
```

- `available` starts `false` and becomes `true` once the hook has
  determined that the current platform's resolved implementation
  actually has that method — *without* calling it (checking availability
  must not itself trigger a fallback recording or invoke the method with
  real arguments).
- `call` invokes the method through the plugin (the same resolution path
  as calling the plugin directly) and returns its promise.

## Ship something visible

The starter's default `App` registers a small `battery` plugin (a web
implementation that always resolves, no native one) and renders whatever
`useCapability` reports for it, plus a button that calls it. Once the
bridge works, it should render without errors and successfully call the
plugin when clicked.
