Implement `resolveSpecifier(specifier, importMap, referrerUrl)`: a pure function that
models a useful subset of the browser's [import map resolution
algorithm](https://html.spec.whatwg.org/multipage/webappapis.html#resolve-a-module-specifier).
There's no real `<script type="importmap">` in this sandbox, so this function is the thing
under test, and the default `App` renders a small resolution table so you can see it work.

## Types already defined

```ts
type ImportMap = {
  imports?: Record<string, string | null>;
  scopes?: Record<string, Record<string, string | null>>;
};
```

A map value of `null` means the specifier is explicitly **blocked** — resolving it should
throw, not silently fall through to another entry.

## Rules to implement, in this order

1. **URL and relative specifiers bypass the map entirely.** If `specifier` starts with
   `/`, `./`, or `../`, or is already a valid absolute URL (has a scheme, like
   `https://cdn.example.com/x.js`), resolve it directly against `referrerUrl` with
   `new URL(specifier, referrerUrl).toString()` and return. Import maps only ever remap
   *bare* specifiers (`"lodash-es"`, `"app/utils.js"`) — never touch specifiers that are
   already URL-shaped.
2. **Scopes.** Scope keys here are already-normalized, absolute URL prefixes (a real
   `<script type="importmap">` lets you write a path like `/vendor/` and the browser
   resolves it against the document's URL for you — this function skips that step and
   expects scope keys already in their final absolute form). Find the *most specific*
   scope whose key is a prefix of `referrerUrl` — the
   longest matching scope key. If `referrerUrl` starts with more than one scope key, the
   longer one wins. If that scope's map resolves the specifier (by rule 3 below), use that
   result. If that scope exists but doesn't resolve the specifier, fall through to the
   top-level `imports` map — do not try a second, less-specific scope.
3. **Within any one map** (a scope's map, or the top-level `imports` map), check for an
   **exact key match** first. If there's no exact match, look for the longest **key ending
   in `/`** that `specifier` starts with, and return that entry's value with the specifier's
   remainder appended (`value + specifier.slice(key.length)`).
4. **Unmapped bare specifier.** If neither the matched scope (if any) nor the top-level
   `imports` map resolves the specifier, throw an `Error` whose message contains the
   specifier.
5. **Blocked (`null`) entries.** If the matched entry's value is `null`, throw an `Error`
   describing that the specifier is blocked — don't return `null` or an empty string.

## Signature

```ts
function resolveSpecifier(specifier: string, importMap: ImportMap, referrerUrl: string): string
```

Keep the export name and parameter order exactly as above — `App` and the checks both call
it directly.
