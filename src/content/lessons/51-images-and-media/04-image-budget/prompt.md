# Audit a page's image budget

A performance dashboard needs to answer, for a given page and request: which format and
width would actually get served, how many bytes that adds up to, what's wrong, and what the
hero image's preload header should say. Implement three pure functions.

## Types

```ts
type Format = 'avif' | 'webp' | 'jpeg';

type ImageSpec = {
  role: 'hero' | 'content';
  url: string; // no extension, e.g. "https://cdn.example.com/photos/harbor"
  renderedWidth: number; // CSS px this image actually displays at
  widths: number[]; // available generated widths, ascending
  bytesByWidth: Record<Format, Record<number, number>>; // byte size per format, per width
  lazy: boolean;
  hasDimensions: boolean;
};

type BudgetResult = {
  totalBytes: number;
  issues: string[];
  preloadHeader: string | null;
};
```

## Functions to implement

```ts
function pickFormat(accept: string): Format;
function pickWidth(available: number[], renderedWidth: number, dpr: number): number;
function imageBudget(images: ImageSpec[], accept: string, dpr: number): BudgetResult;
```

- **`pickFormat(accept)`** reads an HTTP `Accept` header string and returns the best format
  the client claims to support: `'avif'` if the header contains `"image/avif"`, else
  `'webp'` if it contains `"image/webp"`, else `'jpeg'`.
- **`pickWidth(available, renderedWidth, dpr)`** returns the smallest entry in `available`
  that is `>= renderedWidth * dpr`. If every entry is smaller than that target (the image is
  being displayed larger than any generated variant), return the largest available width
  instead of undersizing it.
- **`imageBudget(images, accept, dpr)`** picks a format once (via `pickFormat`), then for
  each image:
  - picks a width via `pickWidth(image.widths, image.renderedWidth, dpr)`,
  - adds `image.bytesByWidth[format][width]` to a running `totalBytes`,
  - pushes `"lazy-hero:" + image.url` onto `issues` if `role === 'hero'` and `lazy` is true
    (the LCP image should never be lazy-loaded),
  - pushes `"missing-dimensions:" + image.url` onto `issues` if `hasDimensions` is false,
  - pushes `"oversized:" + image.url` onto `issues` if the chosen width is more than 1.5x
    the target (`renderedWidth * dpr`) — the image is being sent noticeably bigger than it
    will ever render,
  - for the **first** image with `role === 'hero'`, sets `preloadHeader` to
    `` `<${image.url}.${ext}?w=${width}>; rel=preload; as=image; type="image/${format}"` ``,
    where `ext` is `'jpg'` for `format === 'jpeg'` and otherwise equal to `format`.

  If no image has `role === 'hero'`, `preloadHeader` stays `null`. `issues` order should
  match the order images were processed in.

Export all three functions plus a default `App` that renders the result of `imageBudget` on
a small sample page (JSON is fine) so the preview isn't blank.
