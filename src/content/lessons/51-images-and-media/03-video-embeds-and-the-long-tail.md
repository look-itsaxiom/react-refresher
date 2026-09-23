# Video, embeds, and the long tail

Images get most of the attention because they're usually the LCP element, but video,
third-party embeds, and long pages full of off-screen content carry their own performance
cost — one that's easy to ignore because it doesn't show up in a Lighthouse score the same
way a bloated hero image does.

## `<video>` attributes that actually matter for performance

```html
<video
  poster="preview.jpg"
  preload="metadata"
  muted
  playsinline
  controls
  width="1280"
  height="720"
>
  <source src="clip.av1.mp4" type="video/mp4" />
  <source src="clip.h264.mp4" type="video/mp4" />
</video>
```

- **`preload`** controls how much the browser fetches before playback starts.
  `preload="none"` fetches nothing until the user hits play — right for a video far down the
  page. `preload="metadata"` fetches just enough to know duration and dimensions, which is
  usually the right default: cheap, and lets you size the player correctly without CLS.
  `preload="auto"` (the implicit default in most browsers) can start buffering the whole
  file, which is expensive on a page with multiple videos.
- **`poster`** shows a static image immediately instead of a black box or spinner while the
  video is being fetched or decoded — treat it like the LCP image if the poster is above the
  fold (correct dimensions, no lazy-loading it).
- **`muted autoplay playsinline`** is the modern replacement for animated GIFs. A GIF
  re-encoded as a short muted `<video>` is dramatically smaller — often 10x — for the same
  visual result, because video codecs compress far better than GIF's per-frame palette
  scheme. `playsinline` stops iOS Safari from forcing fullscreen on autoplay.
- **`width`/`height`** on `<video>` prevent layout shift exactly like on `<img>`.

## Adaptive streaming for anything longer than a clip

A fixed-bitrate MP4 either wastes bandwidth on fast connections or stalls on slow ones.
**HLS** (HTTP Live Streaming, Apple's format, natively supported in Safari) and **DASH**
(Dynamic Adaptive Streaming over HTTP, the open equivalent) both split video into short
chunks at multiple bitrates and let the player switch bitrate mid-stream based on measured
bandwidth. Neither format is natively supported by `<video>` in Chrome or Firefox — you need
a JS player. **hls.js** is the standard choice: it fetches HLS manifests and remuxes
segments into something Media Source Extensions can feed to a normal `<video>` element,
falling back to native playback on Safari where HLS already works. For anything longer than
a short autoplay clip — an embedded course video, a marketing reel over a minute — adaptive
streaming through a provider (Mux, Cloudflare Stream, YouTube/Vimeo embeds) beats
self-hosting a single MP4.

## Lazy-load embeds, or better, don't load them at all until asked

```html
<iframe
  src="https://www.youtube.com/embed/dQw4w9WgXcQ"
  loading="lazy"
  width="560"
  height="315"
  title="Product demo"
></iframe>
```

`loading="lazy"` on `<iframe>` (Baseline, all major browsers) defers the fetch until the
frame nears the viewport — free, no JS. But a YouTube or Google Maps embed's *real* cost
isn't the iframe request, it's everything the embedded page pulls in afterward: player
chrome, tracking scripts, sometimes several hundred KB to a couple MB before a single frame
of video decodes. A **facade** — a static poster image styled to look like the player, with
a play button, that only creates the real `<iframe>` on click — defers that entire cost
until the user has expressed intent to watch. `lite-youtube-embed` is the well-known
implementation of this pattern; the same idea applies to embedded maps and chat widgets.

## `content-visibility` for the long tail of a long page

`content-visibility: auto` (Baseline, all major browsers) tells the browser to skip layout,
paint, and (mostly) rendering work for an element until it's near the viewport, similar in
spirit to `loading="lazy"` but for arbitrary content, not just images and iframes:

```css
.section {
  content-visibility: auto;
  contain-intrinsic-size: auto 800px;
}
```

`contain-intrinsic-size` gives the browser a placeholder size to use for off-screen sections
so scrollbar height and layout don't jump once each section is actually measured. This is
the highest-leverage fix for a long article, changelog, or product page with dozens of
sections most visitors never scroll to — the browser stops doing rendering work for content
nobody's looking at, without you doing any manual virtualization.

## Icons: pick one strategy and stop mixing them

- **Inline SVG** (`<svg>` directly in the markup, or as a React component) gives you full
  CSS control (`fill: currentColor`, hover states) and no extra request, at the cost of
  repeating markup if the same icon appears often.
- **SVG sprite** (one `<svg>` with `<symbol>` definitions, referenced via `<use href="#id">`)
  is one request for the whole icon set and still stylable, at the cost of a build step to
  generate the sprite.
- **Icon fonts** (a font file where glyphs are icons) are the legacy option: one request, but
  no per-icon color without extra markup, accessibility issues (icons read as arbitrary
  Unicode to some screen readers unless carefully hidden), and worse rendering at small
  sizes than SVG. Don't start a new project on an icon font in 2026 — inline SVG or a sprite
  covers everything an icon font did, better.

## Auditing: know where to look

- **Lighthouse's "Largest Contentful Paint element"** row names the actual DOM node — check
  it's the image you expect, and that it isn't lazy-loaded.
- **Chrome DevTools → Network → Img filter**, sorted by size, finds the biggest offenders
  fast; the "Priority" column shows whether the browser actually fetched the hero image at
  `High` priority.
- **DevTools → Performance panel → Layout Shift entries** point at the exact element causing
  CLS, which is almost always a missing `width`/`height` or a late-injected banner.
- **Lighthouse's "Properly size images" and "Serve images in next-gen formats"** audits are
  blunt but catch the common case: images sent noticeably larger than their rendered size,
  or still shipped as JPEG/PNG when AVIF/WebP would be smaller.

## Further reading (optional)

- [web.dev: Lazy-loading video](https://web.dev/articles/lazy-loading-video)
- [MDN: `content-visibility`](https://developer.mozilla.org/en-US/docs/Web/CSS/content-visibility)
- [hls.js](https://github.com/video-dev/hls.js)
- [web.dev: Use lazy loading for third-party embeds](https://web.dev/articles/iframe-lazy-loading)
