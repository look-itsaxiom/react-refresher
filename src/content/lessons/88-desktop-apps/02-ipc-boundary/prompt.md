# Build the IPC boundary

There's no real Electron or Tauri here — no Chromium, no Node main process, no Rust core.
What you're building is a **miniature of the boundary itself**: the same allowlisted,
structured-clone-only channel that `contextBridge` + `ipcMain.handle`/`ipcRenderer.invoke`
enforce in Electron, and that a capability ACL enforces in Tauri — just implemented in plain
TypeScript so you can see exactly what "the renderer can only reach what main explicitly
allowed, and can't touch main's memory directly" means in code.

## What to implement

### `createBridge({ handlers, allowlist })`

```ts
function createBridge(config: {
  handlers: Record<string, (...args: any[]) => unknown>;
  allowlist: string[];
}): {
  main: { handlers: Record<string, (...args: any[]) => unknown> };
  renderer: { invoke: (channel: string, ...args: unknown[]) => Promise<unknown> };
};
```

- `renderer.invoke(channel, ...args)` may only reach `handlers[channel]` if `channel` is
  both an **own** key of `handlers` and present in `allowlist`. Otherwise it must reject with
  `Error('Blocked channel: <name>')` — never call the handler at all.
- Every argument is passed through `structuredClone` before the handler sees it, and the
  handler's return value is passed through `structuredClone` again before the renderer sees
  it. That's the same boundary a real IPC channel enforces: no shared references cross it,
  only copies. Concretely: mutating an object *after* passing it to `invoke` must not affect
  what the handler received, and mutating the object `invoke` resolves with must not affect
  anything `handlers` still holds a reference to.
- `structuredClone` already throws when asked to clone a function (it isn't cloneable) — you
  don't need special-case code for that; a function argument should simply propagate as a
  rejected promise, the same way any other clone failure would.
- Because `allowlist` is checked as real data, not string-keyed property access on a plain
  object, a channel literally named `"__proto__"` is just an ordinary disallowed string if
  it isn't in the allowlist — it doesn't need special handling either, but make sure your
  membership checks (on both `handlers` and `allowlist`) don't accidentally treat it as
  special in the *other* direction (i.e. don't let it slip through as "present" when it isn't
  a real own key).

### `expose(api)`

```ts
function expose<T extends Record<string, (...args: any[]) => unknown>>(api: T): Readonly<T>;
```

Mimics `contextBridge.exposeInMainWorld`: takes an object of functions (typically built
around `renderer.invoke`) and returns a **frozen** shallow copy containing only those
methods. Page code that receives the result can call the methods but can't add new ones,
replace existing ones, or otherwise widen what it was handed.

### `guardNavigation(url, { allowedOrigins })`

```ts
function guardNavigation(
  url: string,
  options: { allowedOrigins: string[] },
): 'allow' | 'open-external' | 'deny';
```

The decision a `will-navigate`/`setWindowOpenHandler` guard has to make for every navigation
attempt inside a desktop shell:

- The URL's origin is in `allowedOrigins` → `'allow'` (it's your own app content).
- Otherwise, if the URL's scheme is `https:` → `'open-external'` (hand it to the OS's
  browser instead of navigating the app window itself).
- Anything else — `http:`, `file:`, `javascript:`, `data:`, or a string that isn't a valid
  URL at all — → `'deny'`.

## Ship something visible

The starter's default `App` wires up a tiny bridge with a `whoami` channel and renders the
result of a few `guardNavigation` calls, so you can see the three outcomes without opening
the browser console.
