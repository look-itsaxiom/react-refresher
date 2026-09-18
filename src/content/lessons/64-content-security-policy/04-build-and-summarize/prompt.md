# Build a strict policy, then triage its violation reports

`App.tsx` exports two functions with real bugs.

## `buildStrictCsp(options)`

```tsx
export type StrictCspOptions = {
  nonce: string;
  reportTo?: string;
  trustedTypes?: boolean;
};
```

Returns the recommended strict-CSP header value as a single string, joining
directives with `"; "` (no trailing separator), in this exact order:

1. `script-src 'nonce-<nonce>' 'strict-dynamic'`
2. `object-src 'none'`
3. `base-uri 'none'`
4. only when `trustedTypes` is `true`: `require-trusted-types-for 'script'`
5. only when `trustedTypes` is `true`: `trusted-types 'default'`
6. only when `reportTo` is set: `report-to <reportTo>`

Example, with `{ nonce: 'abc123', trustedTypes: true, reportTo: 'csp-endpoint' }`:

```
script-src 'nonce-abc123' 'strict-dynamic'; object-src 'none'; base-uri 'none'; require-trusted-types-for 'script'; trusted-types 'default'; report-to csp-endpoint
```

Two bugs to fix:

- `base-uri` currently emits `'self'`. The strict template locks it down
  completely: it should be `'none'` (nothing should ever get to rewrite
  `<base href>`, not even a same-origin injection).
- When `trustedTypes` is `true`, the code only emits `trusted-types
  'default'`. It's missing `require-trusted-types-for 'script'` --
  without that directive, `trusted-types 'default'` declares a policy
  name but never actually requires anything to use it.

## `summarizeReports(reports)`

```tsx
export type CspViolationReport = {
  effectiveDirective: string;
  blockedURL: string; // a real URL, or the literal "inline" or "eval"
};

export type ReportGroup = {
  effectiveDirective: string;
  blockedURL: string;
  count: number;
  suggestion: string;
};
```

Groups reports that share **both** `effectiveDirective` and `blockedURL`,
counts them, and attaches one `suggestion` string per group (the
per-`blockedURL` suggestion logic is already written correctly below the
bug -- don't touch it). Groups are sorted by `count` descending, and ties
are broken by `effectiveDirective` then `blockedURL`, both ascending.

One bug to fix:

- The grouping key currently uses `effectiveDirective` alone, so two
  reports for the same directive but different `blockedURL`s (say, one
  inline script violation and one blocked call to `eval`, both under
  `script-src-elem`) get merged into a single group and lose one of their
  suggestions. Group by both fields.

Fix both functions; every check should pass.
