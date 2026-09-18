Start with `parseScalar`. Check `'true'`/`'false'` first, then a quote-stripping regex
like `/^"(.*)"$|^'(.*)'$/`, then `/^-?\d+(\.\d+)?$/` for numbers (`Number(trimmed)`),
then `/^\d{4}-\d{2}-\d{2}$/` for dates (`new Date(trimmed)`). Whatever's left is the
string itself.
---
For the `parseFrontmatter` loop: use a `while (i < fmLines.length)` loop, not a
`for...of`, because the block-array case needs to consume a variable number of extra
lines and adjust `i` itself. Match each line with `/^(\w+):\s*(.*)$/`; `match[1]` is the
key, `match[2]` (trimmed) is `rest`. If a line doesn't match at all, just `i++` and skip
it.
---
For the block-array branch: start a `j = i + 1` cursor, and while
`fmLines[j]?.match(/^\s*-\s+(.*)$/)` succeeds, push `String(parseScalar(itemMatch[1]))`
into an array and increment `j`. Once the loop ends, `data[key] = items` and set
`i = j` (not `i++`) so the outer loop resumes after every line you consumed.
---
For the inline-array branch (`rest.startsWith('[') && rest.endsWith(']')`): take
`rest.slice(1, -1)`, split on `,`, and `.map((part) => String(parseScalar(part.trim())))`.
---
For `matchesType`: a `switch (type)` over the five cases works well. `'date'` needs both
`value instanceof Date` and `!Number.isNaN(value.getTime())` — a value parsed from an
invalid date string is still a `Date` instance, just an invalid one. `'string[]'` needs
`Array.isArray(value) && value.every((v) => typeof v === 'string')`.
---
For `paginate`: guard the empty case first (`entries.length === 0 || perPage <= 0`
returns `[]`). Otherwise `totalPages = Math.ceil(entries.length / perPage)`, then loop
`pageNumber` from `1` to `totalPages`, slicing `entries` at
`(pageNumber - 1) * perPage` for `perPage` items, and setting `prevUrl`/`nextUrl` to
`null` exactly when `pageNumber` is `1` or `totalPages` respectively, `pageUrl(...)`
otherwise.
