Two separate checks gate every `invoke` call: is `channel` an **own** key of `handlers`
(`Object.prototype.hasOwnProperty.call(handlers, channel)`), and is it in the `allowlist`
(a `Set` built from the array, so membership is a real lookup, not string-keyed property
access on a plain object). Both must pass before you touch the handler.

---

Cloning happens twice, on both sides of the call: once on the way in (`args.map((a) =>
structuredClone(a))`, before the handler ever sees them) and once on the way out
(`structuredClone(result)`, after the handler returns, before the promise resolves). You
don't need to special-case a function argument — `structuredClone` already throws on
anything it can't clone, and since your `invoke` is an `async` function, that throw becomes
a rejected promise automatically.

---

`guardNavigation` is three checks in a fixed order: parse the URL first (invalid input, or
schemes like `javascript:`/`data:` that still parse but clearly aren't your app, fall out
naturally later); check origin membership against `allowedOrigins` first (that's the only
path to `'allow'`); then check `protocol === 'https:'` for `'open-external'`; anything left
is `'deny'`.

---

`expose` just needs `Object.freeze({ ...api })` (or a loop copying only function-valued own
keys, which is slightly stricter about what "only the listed methods" means). Freezing means
assigning to a new or existing property on the returned object silently no-ops in non-strict
code and throws a `TypeError` in strict code — either way, nothing gets added.

---

Full shape:

```ts
export function createBridge({ handlers, allowlist }) {
  const allowed = new Set(allowlist);
  return {
    main: { handlers },
    renderer: {
      async invoke(channel, ...args) {
        const isOwn = Object.prototype.hasOwnProperty.call(handlers, channel);
        if (!isOwn || !allowed.has(channel)) {
          throw new Error(`Blocked channel: ${channel}`);
        }
        const clonedArgs = args.map((a) => structuredClone(a));
        const result = await handlers[channel](...clonedArgs);
        return structuredClone(result);
      },
    },
  };
}

export function expose(api) {
  const copy = {};
  for (const key of Object.keys(api)) {
    if (typeof api[key] === 'function') copy[key] = api[key];
  }
  return Object.freeze(copy);
}

export function guardNavigation(url, { allowedOrigins }) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return 'deny';
  }
  if (allowedOrigins.includes(parsed.origin)) return 'allow';
  if (parsed.protocol === 'https:') return 'open-external';
  return 'deny';
}
```
