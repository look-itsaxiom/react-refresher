Start with `parseSizes`. Split the string on whitespace, match each token against
`/^(\d+)x(\d+)$/i`, and collect the first captured number (the width) for every token that
matches. A non-string input, or a string with no matching tokens, should just produce `[]`.
---
For the icon checks, treat "qualifies for the 192px error rule" and "has a 512px icon" as
two different questions. The error rule needs an icon that is *both* image-ish (`isImageish`
on `src`) *and* has some parsed size ≥ 192. The 512px warning only cares about size — it
doesn't re-check the file extension. Use `.some()` over the icons array for both, and reuse
`parseSizes` inside each.
---
For `display`/`display_override`: check `display` against the four-value list first. If
that fails, check whether `display_override` is an array containing at least one string
from the five-value override list. Only push the error if *both* checks fail — a manifest
with an invalid `display` but a valid `display_override` entry is not an error.
---
For `start_url`/`scope`: default `scope` to `'/'` when absent, then it's a single
`.startsWith(scope)` check on `start_url`. Do this check only when `start_url` is present and
a string — a missing `start_url` is already its own error and shouldn't also produce a scope
error.
---
Build the warnings independently of the errors — they can both fire on the same manifest,
and none of them affect `installable`. For the maskable check, remember icons can repeat the
same image at different `purpose` values, so check `purpose === 'maskable'` across the whole
array, not just the first icon.
---
For `resolveDisplayMode`, handle `display_override` as its own loop that returns early. Only
fall into the `DISPLAY_CHAIN` walk if nothing in `display_override` matched (or it was
absent). The starting index into the chain is the chain-position of `manifest.display` if
it's a recognized value, otherwise the position of `'browser'` (the last slot) — that one
detail is what makes a missing/garbage `display` skip straight to `'browser'` instead of
walking the whole chain from the top.
