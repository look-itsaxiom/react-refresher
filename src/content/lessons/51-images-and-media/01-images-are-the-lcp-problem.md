# Images are the LCP problem

On most real pages, the Largest Contentful Paint element is an image — a hero photo, a
product shot, a card thumbnail above the fold. Every decision in this step exists to make
that one image arrive smaller and sooner, and to stop every other image from causing layout
shift or fighting it for bandwidth. If you've been shipping `<img src="photo.jpg" />` since
React 16, most of what changed since is in the platform, not in React.

## Pick the format before anything else

Format choice is the single biggest lever. In September 2026, the practical hierarchy for
photographic content is:

- **AVIF first.** Best compression for photos, wide support (Chrome, Firefox, Safari 16+,
  Edge). Use it for anything where file size matters more than encode time (it's slower to
  encode than WebP).
- **WebP as the fallback.** Slightly larger than AVIF but universally supported and fast to
  encode. Still meaningfully smaller than JPEG at equivalent quality.
- **JPEG last**, only for the browsers that fail both — which by 2026 is close to none.
- **SVG for anything vector** — icons, logos, illustrations, charts. It scales losslessly
  and is usually smaller than a rasterized equivalent.
- **PNG only when you need lossless raster with transparency and the source isn't a photo**
  (screenshots, diagrams with sharp edges). AVIF and WebP both support alpha now, so PNG's
  remaining niche is small.

**JPEG XL is not there yet.** Safari has shipped partial JPEG XL support since 2023 (no
animation, no progressive decode), and Chrome re-added a decoder in version 145 (early
2026) — but it's still behind the `#enable-jxl-image-format` flag, not on by default.
Google has said default enablement depends on a long-term maintenance commitment and
meeting its launch bar, expected some time in the second half of 2026. Don't ship JXL as
your only format yet; it isn't Baseline and most users can't decode it without a flag.

## `<picture>` does format negotiation and art direction

`<picture>` lets the browser pick the first `<source>` whose `type` it can decode, falling
back to the final `<img>`:

```html
<picture>
  <source type="image/avif" srcset="hero-800.avif 800w, hero-1600.avif 1600w" sizes="100vw" />
  <source type="image/webp" srcset="hero-800.webp 800w, hero-1600.webp 1600w" sizes="100vw" />
  <img
    src="hero-800.jpg"
    srcset="hero-800.jpg 800w, hero-1600.jpg 1600w"
    sizes="100vw"
    width="1600"
    height="900"
    alt="Container ship entering the harbor at dawn"
    decoding="async"
    fetchpriority="high"
  />
</picture>
```

`<picture>` also does **art direction** — swapping which crop or composition loads, not just
format — by combining `<source media="...">` with different image files, so a portrait crop
loads on narrow viewports and a wide crop loads on desktop. That's different from `srcset`,
which serves the *same* image at different resolutions.

## `srcset` and `sizes`: two independent decisions

`srcset` with width descriptors (`800w`, `1600w`) tells the browser the intrinsic width of
each candidate. `sizes` tells the browser how wide the image will actually render at a given
viewport, as a CSS length or media-conditioned list:

```html
<img
  srcset="card-400.jpg 400w, card-800.jpg 800w, card-1200.jpg 1200w"
  sizes="(min-width: 768px) 33vw, 100vw"
/>
```

The browser combines its **layout viewport width**, `sizes`, and the device's DPR to pick
the smallest candidate that isn't blurry — before it knows the actual rendered size, because
CSS hasn't been applied yet. That's why `sizes` has to be an honest prediction of layout, not
an afterthought.

Chromium and Firefox added `sizes="auto"` as a shortcut for lazy-loaded images laid out with
plain CSS sizing (`width: 100%`, intrinsic `width`/`height` attributes): the browser resolves
the actual layout size instead of you writing the media-query list by hand. It only applies
to images with `loading="lazy"`. As of September 2026 it ships in Chrome 126+, Edge, and
Firefox 150+, but **Safari doesn't support it yet**, so it's blocked from Baseline — treat it
as a Chromium/Firefox convenience, not something you can rely on everywhere.

DPR-based `srcset` (`1x`, `2x` descriptors) is the older sibling of width descriptors: fine
for images with one fixed display size (an avatar, an icon), but width descriptors plus
`sizes` are strictly more capable for anything that resizes with the viewport.

## Never lazy-load the LCP image

`loading="lazy"` is right for almost every image below the fold — it defers the fetch until
the image nears the viewport, saving bandwidth and unblocking higher-priority requests. It is
wrong for the LCP candidate: lazy-loading it delays the very metric you're trying to improve,
because the browser won't even discover the image needs fetching until layout tells it the
element is near-viewport.

For the hero image, do the opposite of deferring: set `fetchpriority="high"` (Baseline since
October 2024, supported in Chrome 102+, Safari 17.2+, Firefox 132+) so the browser fetches it
at high priority immediately, ahead of lower-priority resources like below-fold images and
non-critical scripts. If the image is referenced from CSS (a background-image hero) or
otherwise not discoverable from the initial HTML scan, add `<link rel="preload" as="image"
href="..." fetchpriority="high">` in the document head instead.

## Stop the layout shift

Every `<img>` and `<video>` needs a `width` and `height` attribute (or a CSS `aspect-ratio`)
so the browser can reserve space before the file downloads. Without it, the image pops into
existence and shoves everything below it down — a Cumulative Layout Shift penalty that's
entirely avoidable. `width`/`height` attributes set the *intrinsic aspect ratio*; CSS can
still override the rendered size, but the ratio holds unless you also override
`aspect-ratio`.

`decoding="async"` tells the browser it doesn't need to block rendering on this image's pixel
decode — useful for anything that isn't the LCP image, where you'd rather show the rest of
the page immediately and paint the image in as soon as it's ready.

## CDNs do the transform work for you

Hand-generating five widths in three formats for every image doesn't scale. Image CDNs
(Cloudinary, imgix, Cloudflare Images) transform on the fly from URL parameters —
`?w=800&fm=avif` — and negotiate format from the request's `Accept` header automatically,
caching each variant at the edge after the first request. Framework components wrap the same
idea locally: Next.js's `<Image>` and Astro's `<Image>`/`<Picture>` generate the `srcset`,
infer `width`/`height` from the source file, lazy-load by default, and can emit a low-quality
placeholder — but they're still just generating the same `<picture>`/`srcset` markup you'd
write by hand, against a loader (a CDN, or Next's built-in optimizer) that does the resizing.
Know what the component produces, because you'll eventually debug the output, not the
abstraction.

## Placeholders buy perceived speed

A **dominant-color** placeholder (a single flat color, computed at build time, shown as a
background until the real image loads) costs nothing and stops a jarring blank flash.
**LQIP** (a tiny, blurred low-quality version inlined as a data URI) and **blurhash** (a
compact string encoding a blurred approximation, decoded client-side into a gradient) go
further, at the cost of a little more setup. All three exist to fill the reserved
`width`/`height` box with *something* plausible while the real bytes are in flight — they
don't replace correct sizing, they decorate it.

## Further reading

- [web.dev: Priority Hints — fetchpriority](https://web.dev/articles/fetch-priority)
- [MDN: Responsive images](https://developer.mozilla.org/en-US/docs/Web/HTML/Guides/Responsive_images)
- [web-features: `sizes="auto"`](https://web-platform-dx.github.io/web-features-explorer/features/sizes-auto/)
- [web.dev: Preload responsive images](https://web.dev/articles/preload-responsive-images)
