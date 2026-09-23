For `applyUpdate`, write the two policies as separate branches at the top:
`if (policy === 'optimistic-lock') { ... return ...; }` then the `lww-field` body below it —
don't try to share logic between them, they reject on genuinely different conditions (one on
the whole row's version, one per field's timestamp).

---

For `'lww-field'`, start from `const nextUpdatedAt = { ...current.updatedAt }` and
`const patch: Partial<Task> = {}`, then loop `Object.entries(update.patch)`; for each
`[field, value]`, compare `update.at` against `current.updatedAt[field]` (treat `undefined`
as "always older," so the new value always wins the first time a field is written). Only
write into `patch` and `nextUpdatedAt` when the new value wins; build the final task as
`{ ...current, ...patch, version: current.version + 1, updatedAt: nextUpdatedAt }` regardless
of how many fields actually changed.

---

For `mergeText`, use `Math.max` of the three arrays' lengths as your loop bound and default
missing lines to `''` (`lines[i] ?? ''`) so `a`/`b`/`base` of different lengths don't throw —
you don't need to *handle* inserted/deleted lines well, just not crash on them.

---

For `createChangeFeed`, keep two closures: a `buffer: Event[]` array and a
`subscribers: { orgId, listener }[]` array, plus a `cursor` counter. `publish` pushes to the
buffer *and* immediately loops `subscribers` checking `event.visibleTo.includes(sub.orgId)`.
`subscribe`'s buffered replay is just `buffer.filter(e => e.cursor > (since ?? Infinity) &&
e.visibleTo.includes(orgId))` — iterate that in order before pushing the new subscriber
entry, so a subscriber that passes no `since` skips replay entirely (`since ?? Infinity`
makes every buffered event fail `cursor > since`).

---

For `PresenceBar`, the whole component is a `.map()`:

```tsx
function PresenceBar({ presence, now }: { presence: PresenceEntry[]; now: number }) {
  return (
    <ul data-testid="presence-bar">
      {presence.map((p) => {
        const stale = now - p.lastSeen > 30_000;
        return (
          <li key={p.userId} data-testid={`presence-${p.userId}`} data-stale={stale ? 'true' : 'false'}>
            {p.name}
            {stale ? ' (away)' : ''}
          </li>
        );
      })}
    </ul>
  );
}
```
