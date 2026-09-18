Split `hex` into R/G/B integers (0–255), divide each by 255, then apply the sRGB gamma correction
per channel: `c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4`. Combine the three
corrected channels with the weights `0.2126`, `0.7152`, `0.0722` — that sum is
`relativeLuminance`.
---
For `contrastRatio`, compute `relativeLuminance` for both colors, then use `Math.max`/`Math.min`
to figure out which one is lighter before plugging into `(lighter + 0.05) / (darker + 0.05)`.
Don't assume `fg` is always the darker one — the swatch table passes light-on-dark pairs too.
---
For `classify`, the "large text" rule is an OR: `fontSizePx >= 24`, or `bold && fontSizePx >=
18.66`. Once you know `large`, pick the right pair of thresholds (3/4.5 for large, 4.5/7 for
normal) and compare with `>=`, not `>` — the boundary values (exactly 4.5, exactly 3) must pass.
---
For `suggestDarken`, figure out the *direction* once, before looping: compare
`relativeLuminance(fg)` to `relativeLuminance(bg)`. If `fg` is the darker one, keep subtracting
from each RGB channel; if it's the lighter one, keep adding. Recompute the hex string and the
ratio after each step, and stop the loop the moment the ratio meets `target` — or once every
channel has hit 0 or 255, so you don't loop forever on an unreachable target.
