# Defenses that hold

## Default to text, not HTML

The cheapest defense is not using a sink. If a field doesn't need real
markup, render it as `{value}` and let JSX escape it. Products reach for
`dangerouslySetInnerHTML` earlier than they need to -- "just render the
description" -- when a plain text node with CSS `white-space: pre-wrap`
covers most of what people actually wanted (preserved line breaks,
no injected markup). Ask whether the field needs bold/links/lists before
reaching for HTML rendering at all.

## Sanitize HTML with DOMPurify

When a field genuinely needs rich text, sanitize it with a real DOM-based
sanitizer -- don't write your own regex stripper (mXSS breaks those, as
covered in the previous section). DOMPurify 3.x is the standard choice:

```ts
import DOMPurify from 'dompurify';

const clean = DOMPurify.sanitize(untrustedHtml, {
  ALLOWED_TAGS: ['p', 'b', 'i', 'em', 'strong', 'a', 'ul', 'ol', 'li'],
  ALLOWED_ATTR: ['href', 'target'],
});
```

Key configuration knobs:

- `ALLOWED_TAGS` / `ALLOWED_ATTR`: an explicit allowlist beats the
  defaults for anything user-facing -- the defaults are broad (most
  formatting tags and attributes) because DOMPurify serves many use
  cases, not because that's the right policy for your comment field.
- `ALLOWED_URI_REGEXP`: overrides which URL schemes survive in
  `href`/`src`/etc.; the default already excludes `javascript:` and
  `data:` outside `img src`, but tightening it to `https?|mailto` for a
  text-only context removes any doubt.
- `RETURN_TRUSTED_TYPE: true`: returns a `TrustedHTML` instance instead
  of a plain string, so assigning the result to `innerHTML` (or React's
  `dangerouslySetInnerHTML`) satisfies a page that enforces Trusted
  Types (below) instead of tripping its CSP violation.
- Hooks (`addHook('afterSanitizeAttributes', ...)`) let you post-process
  every surviving element -- the standard use is forcing
  `rel="noopener noreferrer"` and `target="_blank"` consistently on
  anchors, which is also what modern browsers do automatically for
  `target="_blank"` links (`rel=noopener` is the implicit default there
  now, but don't rely on browser defaults alone for a field you control).

DOMPurify runs client-side against the real DOM parser, which is why it
resists mXSS in a way string-based approaches don't: it sanitizes, then
serializes, then **sanitizes the serialized output again** by default,
specifically to catch cases where re-parsing the "clean" output would
mutate it into something dangerous.

## The native alternative: the Sanitizer API

`Element.setHTML(html, { sanitizer })` is a browser-native equivalent --
parse untrusted HTML and insert it pre-sanitized, no library. As of late
2025/2026 it's still a "Limited availability" feature per MDN: it's not
Baseline because support isn't universal across major engines yet.
Treat it as progressive enhancement (feature-detect
`'setHTML' in Element.prototype`) with DOMPurify as the fallback, not a
drop-in replacement yet, and re-check support before depending on it for
a shipped feature.

## Validate URLs explicitly

For any attribute that takes a URL -- `href`, `src`, `formAction` -- parse
it and check the scheme before use, independent of whatever HTML
sanitization already happened to the surrounding markup:

```ts
function safeHref(value: string): string | undefined {
  try {
    const url = new URL(value, window.location.href);
    return ['http:', 'https:', 'mailto:'].includes(url.protocol) ? url.href : undefined;
  } catch {
    return undefined;
  }
}
```

`new URL()` is doing more work here than it looks like: the WHATWG URL
spec strips leading/trailing whitespace and control characters and
removes embedded tabs/newlines before parsing, which is exactly the
class of trick (`"  javascript:alert(1)"`, a scheme split across a
newline) that a naive `value.startsWith('javascript:')` check misses.
Fall back to rendering the text as plain text (or a disabled link) when
validation fails -- don't silently drop the whole field.

## Trusted Types: make the sinks safe by construction

Trusted Types is a browser enforcement mechanism, not a sanitizer
itself: once a page opts in (via CSP `require-trusted-types-for
'script'`), the browser refuses to assign a plain string to a dangerous
DOM sink (`innerHTML`, `Element.setAttribute('src', ...)` for script-like
attributes, `eval`) at all -- only a `TrustedHTML`/`TrustedScript`/
`TrustedScriptURL` object produced by a policy you registered will be
accepted. This converts "did every code path remember to sanitize"
(a discipline problem, one missed call site from a bug) into "the
browser physically rejects the unsanitized assignment" (a build-time and
runtime guarantee). As of 2026 Trusted Types reached **Baseline: newly
available** (February 2026) -- it now works across current versions of
the major browser engines, though older browser versions in the field
won't enforce it (a `default` policy or feature-detection keeps the page
functional there; enforcement is additive, not something you can rely on
universally yet). It pairs with CSP, which is the next lesson -- treat
everything above as the actual defense and CSP/Trusted Types as the
safety net that catches the sink you (or a dependency) forgot to guard.

## What your framework already does for you

- **`react-markdown`** does not render raw HTML by default -- no
  `rehype-raw` plugin means embedded `<script>`/`<img onerror>` in
  markdown source renders as literal text, not markup. The moment a
  project adds `rehype-raw` (to support raw HTML in markdown, a common
  ask), it re-opens exactly the sink this lesson is about, and needs
  `rehype-sanitize` right behind it.
- **Next.js** and other meta-frameworks that inject small inline scripts
  (hydration data, analytics snippets) need `unsafe-inline` or a
  nonce/hash in their CSP for those specific scripts -- covered in the
  CSP lesson.

## Audit for sinks

Before shipping a sanitizer, find every place a payload could reach:

```bash
grep -rn "dangerouslySetInnerHTML\|\.innerHTML\s*=\|outerHTML\s*=\|document\.write\|insertAdjacentHTML" src/
grep -rn "\beval(\|new Function(" src/
```

`new Function` and `eval` are DOM-adjacent code-execution sinks, not HTML
sinks, but they show up in the same audit for the same reason: untrusted
strings should never reach either. (This course's own sandbox runner
uses `new Function` to compile learner code -- deliberately, inside a
sandboxed iframe with no access to real user data or credentials, which
is the only context where that pattern is defensible.)

## Further reading (optional)

- [DOMPurify README and configuration options](https://github.com/cure53/DOMPurify)
- [MDN: HTML Sanitizer API](https://developer.mozilla.org/en-US/docs/Web/API/HTML_Sanitizer_API)
- [MDN: Trusted Types](https://developer.mozilla.org/en-US/docs/Web/API/Trusted_Types_API)
- [web.dev: Prevent DOM-based XSS with Trusted Types](https://web.dev/articles/trusted-types)
