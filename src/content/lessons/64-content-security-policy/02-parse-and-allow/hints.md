`parseCsp` uses `policy.set(name, sources)` for every directive it sees,
even ones it's already recorded. Guard that call so it only sets a
directive the first time its name is encountered.

---

For `'unsafe-inline'`, you already compute `hasNonceOrHash` above the
loop but never check it in the `'unsafe-inline'` branch. Add that check
before honoring the source: `if (hasNonceOrHash) continue;`.

---

For the host/scheme bug, you already compute `hasStrictDynamic` above the
loop. Add a check right before the scheme-source and host-source
matching (but after the keyword-source checks, since those still apply
under strict-dynamic): if `hasStrictDynamic && load.type === 'script-elem'`,
`continue` past that source without matching it.

---

Full shape of the fix in `allows`, right after the `'self'` branch and
before the scheme/host checks:

```tsx
if (hasStrictDynamic && load.type === 'script-elem') continue;

if (/^[a-z][a-z0-9+.-]*:$/i.test(source)) {
  if (load.url && matchesScheme(load.url, source)) return true;
  continue;
}
```
