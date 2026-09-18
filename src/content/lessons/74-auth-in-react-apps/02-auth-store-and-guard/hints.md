Start with `RequireAuth` — it's the smaller piece. `useSyncExternalStore(store.subscribe,
store.getSnapshot)` gives you the current `AuthState`; branch on `state.status` in the
order the prompt lists (unknown, then anonymous, then role check, then children).

---

For `bootstrap()`'s "exactly once" requirement, don't call `api.me()` inside the function
body directly — cache the *promise itself* in a variable declared outside the returned
object (in the closure), and return that cached promise on every call after the first.
The same pattern applies to `fetchWithAuth`'s refresh dedupe.

---

For the dedupe in `fetchWithAuth`: after `api.refresh()` settles, clear the cached
refresh promise (a `.finally()` on it works well) so a *future*, unrelated 401 can trigger
a fresh refresh — you only want to dedupe refreshes that are genuinely concurrent, not
refuse to ever refresh again.

---

For cross-tab logout, the store needs to listen on its own `channel` for messages sent by
*other* channels with the same name — set `channel.onmessage` once, inside
`createAuthStore`, not inside `logout()`. `logout()` itself both updates local state
*and* calls `channel.postMessage(...)` so other tabs hear about it.

---

Full shape of the store's returned object:

```ts
return {
  subscribe(cb) { /* add/remove from a Set of listeners */ },
  getSnapshot() { return state; },
  bootstrap() { /* cache and return a promise that calls api.me() once */ },
  async login(creds) { /* call api.login, update state */ },
  logout() { /* update state, then channel.postMessage */ },
  async fetchWithAuth(path) { /* call api.fetch; on 401, dedupe a refresh, retry once */ },
};
```
