# Parse a CSP header and decide what it allows

`App.tsx` exports two functions with real bugs, plus a small `App` that
displays what they decide for a sample policy.

## The types

```tsx
export type CspPolicy = Map<string, string[]>;

export type ResourceLoad = {
  type: 'script-elem' | 'script-attr' | 'style' | 'img' | 'connect' | 'frame' | 'font';
  url?: string;
  inline?: boolean;
  nonce?: string;
  hash?: string;
  parserInserted?: boolean;
};
```

`parseCsp(header)` turns a raw header string into a `CspPolicy`: a map from
directive name to its list of source-expression tokens, in the order they
appeared, splitting on `;` between directives and whitespace between
tokens. **Per the CSP spec, if a directive name appears more than once in
the same header, only the first occurrence counts** -- later repeats of
the same name are ignored entirely.

`allows(policy, load, pageOrigin)` decides whether a `ResourceLoad` is
permitted. `pageOrigin` is the page's own origin, e.g. `"https://app.example.com"`,
used to evaluate `'self'`.

## What's already correct

- The fallback chain per `type` (`script-elem` -> `script-src-elem` ->
  `script-src` -> `default-src`; the others fall back through their own
  `-src` directive to `default-src`).
- If none of a type's chain directives are present anywhere in the policy,
  the load is unrestricted (`allows` returns `true`).
- `'self'` matching against `pageOrigin`, `'none'` matching nothing, host
  sources (including `*.` wildcard subdomains) and bare-scheme sources
  (`https:`, `data:`) against `load.url`.
- Nonce sources only apply to `'script-elem'`/`'style'` loads, never to
  `'script-attr'` (event-handler attributes aren't covered by nonces).
- Hash sources apply to `'script-elem'`/`'style'`, and to `'script-attr'`
  only when `'unsafe-hashes'` is also present in the same source list.

## The three bugs to fix

1. **`parseCsp` keeps the last occurrence of a repeated directive, not the
   first.** Given `"script-src 'none'; script-src 'self'"`, it currently
   returns `script-src -> ["'self'"]`; it should return
   `script-src -> ["'none'"]`.
2. **`'unsafe-inline'` is honored even when a nonce or hash source is
   present in the same directive.** Per spec, any `'nonce-...'` or
   `'sha...'` source in a directive makes the browser ignore
   `'unsafe-inline'` in that directive entirely -- currently the code lets
   `'unsafe-inline'` grant access regardless.
3. **`'strict-dynamic'` doesn't suppress host/scheme sources for
   `'script-elem'` loads.** Per spec, when a `script-src`-family directive
   contains `'strict-dynamic'`, host-source and scheme-source expressions
   in that directive must be ignored for script elements -- currently they
   still grant access.

Fix all three; every check should pass.
