# Build a `ResponsiveImage` component

The starter renders a plain `<img src={baseUrl} />` — no dimensions, no `srcset`, and
`loading="lazy"` even when it's marked as the page's priority (LCP) image. Fix it.

## What to build

Implement two pure functions and use them inside the `ResponsiveImage` component:

```ts
function buildSrcset(baseUrl: string, widths: number[]): string;
function pickSizes(layout: 'hero' | 'card' | 'thumb'): string;
```

- `buildSrcset(baseUrl, widths)` returns a `srcset`-ready string using the CDN's `w` query
  parameter as a width descriptor: for `baseUrl = "https://cdn.example.com/harbor.jpg"` and
  `widths = [400, 800]`, return
  `"https://cdn.example.com/harbor.jpg?w=400 400w, https://cdn.example.com/harbor.jpg?w=800 800w"`.
- `pickSizes(layout)` returns the `sizes` attribute value for a layout slot:
  - `'hero'` → `"100vw"`
  - `'card'` → `"(min-width: 768px) 33vw, 100vw"`
  - `'thumb'` → `"96px"`

Then make `ResponsiveImage` render a `<picture>` with:

- an AVIF `<source>` (`type="image/avif"`) whose `srcset` is `buildSrcset` against
  `${baseUrl}.avif` and whose `sizes` comes from `pickSizes(layout)`,
- a WebP `<source>` (`type="image/webp"`) the same way against `${baseUrl}.webp`,
- a fallback `<img>` whose `src` is `${baseUrl}.jpg?w=<the largest width>`, whose `srcset`
  and `sizes` are built the same way against `${baseUrl}.jpg`, and that carries:
  - `width` and `height` (from props, to prevent layout shift),
  - `decoding="async"`,
  - `alt` (from props),
  - `loading="eager"` and `fetchPriority="high"` when `priority` is `true` (the LCP image),
    otherwise `loading="lazy"` and no `fetchPriority` override.

## Signature

```ts
type Layout = 'hero' | 'card' | 'thumb';

type ResponsiveImageProps = {
  baseUrl: string; // e.g. "https://cdn.example.com/harbor" (no extension)
  alt: string;
  widths: number[]; // ascending, e.g. [400, 800, 1200, 1600]
  width: number; // intrinsic width, for the width attribute
  height: number; // intrinsic height, for the height attribute
  layout: Layout;
  priority?: boolean; // true only for the page's LCP image
};

function ResponsiveImage(props: ResponsiveImageProps): JSX.Element;
```

Export `buildSrcset`, `pickSizes`, and `ResponsiveImage` from `App.tsx`, and render a default
`App` that shows one of each layout so the preview isn't blank.
