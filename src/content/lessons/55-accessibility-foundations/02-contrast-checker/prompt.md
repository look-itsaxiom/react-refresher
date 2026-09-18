Every automated accessibility scanner — axe, Lighthouse, the WebAIM Million crawler — flags color
contrast the same way: compute two colors' relative luminance, turn that into a ratio, and compare
the ratio against a threshold that depends on how big and bold the text is. You're building that
pipeline.

Implement four exported functions. A tiny default `App` that renders a swatch table is already
wired up to call them — you're filling in the logic, not the UI.

```ts
function relativeLuminance(hex: string): number;
function contrastRatio(fg: string, bg: string): number;
function classify(
  ratio: number,
  options: { fontSizePx: number; bold?: boolean },
): { large: boolean; passesAA: boolean; passesAAA: boolean };
function suggestDarken(fg: string, bg: string, target: number): string;
```

**`relativeLuminance(hex)`** — implement the WCAG formula. `hex` is a 6-digit hex color, with or
without a leading `#`. Normalize each of R, G, B to 0–1, apply the sRGB gamma correction
(`c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4`), then combine as
`0.2126*R + 0.7152*G + 0.0722*B`. White is `1`, black is `0`.

**`contrastRatio(fg, bg)`** — `(L1 + 0.05) / (L2 + 0.05)`, where `L1` is the *lighter* of the two
colors' relative luminance and `L2` is the darker one. The function is symmetric:
`contrastRatio(a, b)` and `contrastRatio(b, a)` must return the same number.

**`classify(ratio, { fontSizePx, bold })`** — first decide whether the text counts as "large" per
WCAG: **18.66px and bold, or 24px regardless of weight**. Then return which levels the ratio
satisfies at that size:

| | normal text | large text |
|---|---|---|
| AA | 4.5:1 | 3:1 |
| AAA | 7:1 | 4.5:1 |

**`suggestDarken(fg, bg, target)`** — return a new hex color, adjusted from `fg` toward whichever
end of the lightness scale increases its contrast against `bg`, that meets `target` (or gets as
close as the extremes of black/white allow). Concretely: if `fg` is already darker than `bg`,
push it further toward black; if `fg` is lighter than `bg`, push it further toward white. Step by
small increments and stop as soon as `contrastRatio(result, bg) >= target`.

The classic reference pair — `#767676` text on a `#ffffff` background — should come out to
**approximately 4.54:1**, which is why WebAIM and most design systems use that exact gray as the
example of "the darkest gray that still barely clears AA for normal text."
