Implement `resolvePackageExports(pkg, subpath, conditions)` and `hazardCheck(pkg)`: pure
functions modeling a subset of [Node's package `exports`
resolution](https://nodejs.org/api/packages.html#package-entry-points). No file system is
involved — `pkg` is a plain object shaped like a parsed `package.json`.

## Types already defined

```ts
type ExportsTarget = string | null | { [condition: string]: ExportsTarget };

type PackageJson = {
  name?: string;
  exports?: ExportsTarget | Record<string, ExportsTarget>;
};
```

## `resolvePackageExports(pkg, subpath, conditions)`

- `subpath` is `"."` for the package's main entry, or `"./something"` for a named export.
- **Shorthand form:** if `pkg.exports` is a string (or `null`), that's shorthand for
  `{ ".": <that value> }` — only subpath `"."` is valid against it.
- **Subpath map vs. conditions object:** if `pkg.exports` is an object, decide which shape
  it is by its keys. If every key starts with `"."`, it's a subpath map — each key is a
  subpath, each value is that subpath's target (a string, `null`, or a nested conditions
  object). If *no* key starts with `"."`, the whole object is a conditions object for
  subpath `"."` directly (this is the common single-entry-point shorthand you'll see in
  real packages: `{ "import": "...", "require": "..." }` with no `"."` wrapper). If keys
  are mixed — some starting with `"."`, some not — throw an `Error`; that shape is invalid.
- **Exact subpath match wins over patterns.** If `subpath` is a literal key in the map, use
  its target directly (no `*` substitution).
- **Pattern subpaths.** A key containing exactly one `*` (e.g. `"./features/*"`) matches
  any subpath with that key's prefix and suffix around the `*`. When more than one pattern
  key matches, the one with the **longer prefix before the `*`** wins. Substitute the
  captured text for every `*` in the resolved string target.
- **Resolving a target once you have it:** a string target resolves directly (after any `*`
  substitution). A `null` target means the subpath is blocked — throw a descriptive `Error`.
  A conditions-object target is walked **in the order its keys appear**: the first key that
  is either `"default"` or present in the `conditions` array is used (recursing into its
  value, which itself might be a nested conditions object); if that key's resolution comes
  up empty, keep scanning later keys in the same object. If nothing in the object matches
  any requested condition and there's no `"default"`, that's "no matching condition."
- **Errors.** Throw a descriptive `Error` for: no `exports` field at all, an invalid mixed
  subpath/condition object, a subpath that isn't exported (no exact or pattern key matches
  it), a target that resolves to `null` (blocked), and a conditions object with no matching
  condition and no `"default"`.

## `hazardCheck(pkg)`

Returns `true` if resolving subpath `"."` under `["import"]` and under `["require"]` both
succeed but produce **different** file targets — the shape of a classic dual-package
hazard, where an `import` consumer and a `require` consumer can end up with two separate
module instances. Returns `false` if either resolution fails (nothing to compare) or if
they resolve to the same target (no hazard — same file, same instance either way).

## Signatures

```ts
function resolvePackageExports(pkg: PackageJson, subpath: string, conditions: string[]): string
function hazardCheck(pkg: PackageJson): boolean
```
