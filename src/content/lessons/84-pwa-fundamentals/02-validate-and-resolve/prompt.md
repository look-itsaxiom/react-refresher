Real manifests are hand-edited JSON, and it's easy to ship one that silently fails to
install, or that installs but looks wrong. Implement two pure functions that catch that
before it reaches a browser.

## 1. `validateManifest(manifest: unknown): { errors: string[]; warnings: string[]; installable: boolean }`

Treat `manifest` as untyped input — it came from a JSON file, so check its shape defensively.
Use this rule set (a deliberately simplified version of Chromium's real installability
check):

**Errors** (any error means `installable: false`):
- Neither `name` nor `short_name` is a non-empty string.
- `start_url` is missing, not a string, or resolves outside `scope` (see below). If `scope`
  is absent, treat it as `"/"` for this check — everything is in scope.
- `display` is not one of `'fullscreen' | 'standalone' | 'minimal-ui' | 'browser'`, **unless**
  `display_override` is present and contains at least one value from
  `['fullscreen', 'standalone', 'minimal-ui', 'window-controls-overlay', 'tabbed']`.
- `icons` is missing, not an array, or contains no entry that is both a PNG-or-SVG-ish file
  (`src` ends in `.png`, `.svg`, or `.webp`, case-insensitive) **and** has a `sizes` string
  parseable to a width ≥ 192 (sizes look like `"192x192"` or a space-separated list like
  `"48x48 192x192"` — an icon qualifies if *any* size in its list has width ≥ 192).

**"Outside scope" rule for `start_url`:** both are paths (no origin handling needed — test
fixtures use root-relative paths like `/` and `/app/`). `start_url` is in scope when it
starts with `scope`'s string value; `/app/start` is in scope of `/app/` and of `/`, but not
of `/dashboard/`.

**Warnings** (never affect `installable`, and can stack with errors or with each other):
- No `id` field.
- No icon with `sizes` parsing to width ≥ 512.
- No icon anywhere has `purpose` equal to `'maskable'` (a manifest can list the same icon
  twice with different `purpose` values — check across the whole array).
- No `screenshots` array, or it's present but empty.
- `theme_color` is present but is not a valid hex color (`#rgb` or `#rrggbb`, case-insensitive;
  missing `theme_color` entirely is fine and produces no warning).

Return errors and warnings in the order the rules are listed above (skip a rule that
doesn't apply; don't emit empty-string entries). `installable` is `true` only when `errors`
is empty.

## 2. `resolveDisplayMode(manifest, supported)`

`resolveDisplayMode(manifest: { display?: string; display_override?: string[] }, supported: string[]): string`
implements the fallback chain from the concept step. Walk `display_override` (if present) in
order and return the first entry that is present in `supported`. If nothing in
`display_override` matches (or it's absent), fall back to walking the chain
`['fullscreen', 'standalone', 'minimal-ui', 'browser']` starting from wherever `manifest.display`
sits in that chain (an unrecognized or missing `display` starts the walk from `'browser''`),
returning the first mode from that point onward that's in `supported`. `'browser'` is always
assumed supported and is the final fallback if nothing else matches, even if it's missing
from `supported`.

Both functions are pure. `App` below renders `validateManifest`'s result against a small
fixture manifest so you can see it working — you shouldn't need to touch `App`.
