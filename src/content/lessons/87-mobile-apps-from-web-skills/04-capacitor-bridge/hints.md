Keep the "which implementation, and does it have this method" logic in
one shared async helper — something like `resolveMethod(registration,
methodName, recordFallback)` — and call that same helper from both the
proxy's method call *and* from `useCapability`'s availability check. That
sidesteps duplicating the native → fallback → web → unimplemented chain
in two places that could drift out of sync.

---

You need a place to remember each plugin's `{ name, impls, webPromise? }`
after `registerPlugin` returns the proxy, so `useCapability` (which only
receives the proxy object, not the registration) can look it up. A
`WeakMap<object, Registration>`, keyed by the proxy itself and populated
right before `registerPlugin` returns it, does this without leaking
memory and without needing to attach extra properties to the proxy.

---

Caching the web implementation is exactly the "lazy, memoized async
value" pattern: store a `Promise<T> | undefined` on the registration, and
the very first thing your loader function does is check "do we already
have one?" — if not, call `impls.web()` (wrapped in `Promise.resolve` so
it works whether `web()` returned a value or a promise) and *store that
promise itself*, before anything awaits it. Every subsequent call reuses
the same stored promise instead of calling `impls.web()` again.

---

The fallback-recording flag matters: your shared `resolveMethod` helper
is called both for a real call (where a fallback should be recorded) and
for `useCapability`'s peek (where it should not be, since checking
availability isn't itself an event worth recording). Pass a boolean
parameter through and only push onto `bridge.fallbacks` when it's `true`.

---

Full shape:

```ts
async function resolveMethod(reg, method, recordFallback) {
  if (bridge.platform !== 'web' && reg.impls.native) {
    const nativeImpl = reg.impls.native();
    if (typeof nativeImpl[method] === 'function') return nativeImpl[method].bind(nativeImpl);
    if (recordFallback) bridge.fallbacks.push(`${reg.name}.${method}`);
  }
  const web = await loadWeb(reg);
  return typeof web[method] === 'function' ? web[method].bind(web) : undefined;
}

export function registerPlugin(name, impls) {
  const reg = { name, impls };
  const proxy = new Proxy({}, {
    get(_t, prop) {
      return async (...args) => {
        const fn = await resolveMethod(reg, prop, true);
        if (!fn) {
          const err = new Error(`"${prop}" is not implemented on plugin "${name}"`);
          err.code = 'UNIMPLEMENTED';
          throw err;
        }
        return fn(...args);
      };
    },
  });
  registryByProxy.set(proxy, reg);
  return proxy;
}

export function useCapability(plugin, method) {
  const [available, setAvailable] = useState(false);
  useEffect(() => {
    let cancelled = false;
    const reg = registryByProxy.get(plugin);
    if (!reg) return;
    resolveMethod(reg, method, false).then((fn) => { if (!cancelled) setAvailable(Boolean(fn)); });
    return () => { cancelled = true; };
  }, [plugin, method]);
  const call = useCallback((...args) => plugin[method](...args), [plugin, method]);
  return { available, call };
}
```
