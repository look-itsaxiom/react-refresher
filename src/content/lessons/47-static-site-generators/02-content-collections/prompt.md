This is the pipeline from the previous concept step, as pure functions: parse one
file's frontmatter, validate a whole directory of files against a schema, and paginate
the result. No framework runs here — this is what Astro's content layer, Eleventy's
data cascade, and Docusaurus's frontmatter parsing all do internally before a template
ever sees a value.

Three pieces need finishing in `App.tsx`:

## 1. `parseScalar(raw)`

Classify one already-trimmed frontmatter value: `'true'`/`'false'` → boolean, a quoted
string → the string inside the quotes, a bare integer or decimal → number, a
`YYYY-MM-DD` date → `Date`, anything else → the string unchanged.

## 2. The parsing loop inside `parseFrontmatter(text)`

The file is already split into `---`-delimited frontmatter lines (`fmLines`) and body
`content`. Walk `fmLines` and fill `data`. Each line matches `key: rest`. Three shapes of
`rest`:

- **Empty** — a block array. The value lives on the following lines, each shaped like
  `  - item`. Collect them (via `parseScalar`, coerced to `string`) until a line doesn't
  match that shape, store the collected list as `data[key]`, and advance your loop index
  past every line you consumed.
- **`[a, b, c]`** — an inline array. Split the text between the brackets on commas and
  `parseScalar` (coerced to `string`) each piece.
- **Anything else** — a plain scalar: `data[key] = parseScalar(rest)`.

## 3. `matchesType(value, type)`

Used by `buildCollection` (already wired up) to validate one frontmatter value against
one schema field's declared type. `'date'` means "is a valid `Date` instance"; `'string[]'`
means "an array where every element is a `string`"; the rest are plain `typeof` checks.
An invalid entry (a required field missing, or a present field with the wrong type)
becomes an error instead of an entry — `buildCollection` already routes that, you just
need `matchesType` to report correctly.

## 4. `paginate(entries, perPage)`

Split `entries` into 1-indexed pages of `perPage` items, using the given `pageUrl`
helper for `prevUrl`/`nextUrl` (`null` at the first/last page). Empty input produces an
empty array of pages.

`buildCollection`'s slug generation (kebab-case the filename, or use a frontmatter
`slug` override) and the default `App` are already written.
