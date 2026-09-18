`buildSrcset` is a one-liner: `widths.map((w) => \`${baseUrl}?w=${w} ${w}w\`).join(', ')`. Each
candidate is `<url-with-w-param> <width>w`, joined by `", "` — no trailing comma, no extra
whitespace beyond the single space before `w`.
---
`pickSizes` is a plain switch or lookup object over the three layout strings — there's no
computation involved, just returning the literal string the prompt specifies for each case.
---
Build the three `srcset` strings by calling `buildSrcset` against `${baseUrl}.avif`,
`${baseUrl}.webp`, and `${baseUrl}.jpg` respectively — same widths array, three different
extensions. All three `<source>`/`<img>` elements share the same `sizes` value from
`pickSizes(layout)`.
---
The fallback `<img>`'s plain `src` needs *some* URL for browsers that ignore `srcset`
entirely — use the largest entry in `widths` (`widths[widths.length - 1]`) so that fallback
is never blurrier than necessary. Set `loading`/`fetchPriority` from the `priority` prop:
`priority ? 'eager' : 'lazy'` for `loading`, and only set `fetchPriority="high"` when
`priority` is true (leave it unset otherwise — don't pass `"auto"` or `"low"`).
