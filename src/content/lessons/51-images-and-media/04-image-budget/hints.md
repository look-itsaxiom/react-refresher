`pickFormat` just checks substrings in priority order: if the `accept` string contains
`"image/avif"` return `'avif'`; else if it contains `"image/webp"` return `'webp'`; else
`'jpeg'`. Real `Accept` headers list several types with `q=` weights, but for this exercise
a plain substring check is enough.
---
`pickWidth` needs the target in the *same units* as the entries in `available`: multiply
`renderedWidth * dpr` first, then find the smallest available width that's `>=` that target.
Sort a copy of `available` ascending and use `.find()` — if nothing qualifies (the image
renders bigger than the largest generated variant), fall back to the largest entry instead
of returning `undefined`.
---
Each issue is a plain string built with a colon: `` `lazy-hero:${image.url}` ``,
`` `missing-dimensions:${image.url}` ``, `` `oversized:${image.url}` ``. The "oversized"
check compares the *chosen* width against `renderedWidth * dpr * 1.5`, not against the
image's raw `renderedWidth` — a 2x DPR request legitimately needs a wider file.
---
Track `preloadHeader` in a variable initialized to `null`, and only set it once — inside the
loop, guard with `image.role === 'hero' && preloadHeader === null` so a page with two hero
images (which shouldn't happen, but the function shouldn't crash on it) still only preloads
the first. The extension is `'jpg'` when `format === 'jpeg'`, otherwise the format name
itself (`'avif'` or `'webp'`).
