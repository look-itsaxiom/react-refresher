# Sanitize HTML with an allowlist

Implement `sanitizeHtml(html, policy)` in `App.tsx`. It takes an
untrusted HTML string and returns a safe HTML string, suitable for
`dangerouslySetInnerHTML`, containing only the formatting the policy
allows.

## What it must do

1. Parse `html` with `DOMParser` (`'text/html'`) -- not string
   manipulation or regex. mXSS-resistant sanitization requires working
   on the parsed tree the browser will actually build, not the raw
   string.
2. Walk the resulting tree. For each element:
   - If its tag is `script`, `style`, `iframe`, `object`, or `embed`,
     remove the element **and its entire subtree** -- none of its
     content should survive, not even as text.
   - Otherwise, if its tag is **not** in `policy.tags`, drop the tag but
     keep its (already-cleaned) children in its place -- unwrap it,
     don't delete its content.
   - Otherwise (an allowed tag): strip every attribute that is not in
     that tag's allowed-attribute list, and separately strip **any**
     attribute whose name starts with `on` even if it were somehow
     allowlisted.
   - For a surviving `href` or `src` attribute, validate it with
     `new URL(value, 'https://example.invalid')` and keep it only if the
     resulting scheme is `http:`, `https:`, or `mailto:`. Remove the
     attribute otherwise (don't throw -- a bad URL just loses that
     attribute).
   - If the element is an `a` with a `target` attribute, force
     `rel="noopener noreferrer"` on it.
3. Serialize the cleaned tree back to an HTML string (`Element.innerHTML`
   of the container you cleaned) and return it.

The default policy (exported as `DEFAULT_POLICY`, used when `policy` is
omitted) allows: `p`, `b`, `i`, `em`, `strong`, `ul`, `ol`, `li`, `code`,
`pre`, `br` (no attributes on any of those), `a` (`href`, `target`), and
`img` (`src`, `alt`).

The starter's `sanitizeHtml` is a no-op that returns `html` unchanged --
replace the body, keep the signature.

## Why the tree walk, not a regex

A regex sanitizer sees the string you hand it. The browser's actual HTML
parser will re-interpret that string according to rules a regex doesn't
know about -- unclosed tags, foreign content (SVG/MathML) namespace
switches, attribute value quirks -- and can end up building a different,
dangerous DOM from "safe-looking" text. Parsing with `DOMParser` first
means you're filtering the same tree the browser will render, which is
what makes this approach resistant to mutation XSS.
