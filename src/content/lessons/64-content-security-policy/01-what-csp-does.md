# What CSP does and how policies are evaluated

Content-Security-Policy (CSP) is a response header (`Content-Security-Policy: ...`)
that tells the browser which origins and syntactic forms are allowed to act as
script, style, image, connection, frame, and font sources for a page. It is
**defense in depth, not a fix for XSS**: the previous lesson covered escaping,
DOMPurify, and Trusted Types, and all of that still has to be correct. What CSP
adds is a second, independent layer that limits *what an injected payload can
do* even if the first layer fails -- a script an attacker manages to get into
the DOM still can't execute if the page's policy doesn't permit it. Treat a
strict CSP the way you'd treat a firewall rule: it doesn't replace input
validation, it bounds the damage when validation misses something.

## Directives and fallback

A policy is a semicolon-separated list of directives, each starting with a
name and followed by space-separated source expressions:

```
Content-Security-Policy: default-src 'self'; script-src 'nonce-r4nd0m' 'strict-dynamic'; object-src 'none'; base-uri 'none'
```

The directives that matter for a frontend: `default-src` (the fallback for
everything below), `script-src` / `script-src-elem` / `script-src-attr`
(`-elem` covers `<script>` tags and dynamically inserted script elements,
`-attr` covers inline event-handler attributes like `onclick`),
`style-src` (and its own `-elem`/`-attr` split), `img-src`, `connect-src`
(`fetch`, `XHR`, WebSocket, EventSource), `font-src`, `frame-src` (things
this page embeds), `frame-ancestors` (things that may embed *this* page --
covered in lesson 66), `worker-src`, `base-uri` (who may set `<base href>`),
`object-src` (`<object>`/`<embed>`/`<applet>`), `form-action` (where
`<form>` may submit), `upgrade-insecure-requests`, and the Trusted Types
pair `require-trusted-types-for` / `trusted-types`.

Each directive falls back to `default-src` only if it's absent entirely --
if `script-src` is present with any value (even `'none'`), `default-src`
is never consulted for scripts. The narrower `-elem`/`-attr` directives
fall back to their parent before that: for a `<script>` element, the
browser checks `script-src-elem`, then `script-src`, then `default-src`,
in that order, stopping at the first one present. A directive that's
present but empty of matching sources blocks everything of that type; a
load type with **no** directive in the whole chain, including
`default-src`, is unrestricted by CSP -- there's nothing to fall back to.
This is why a real policy sets `default-src 'self'` (or `'none'`) even
when every specific directive is also spelled out: it's the backstop for
any directive you forgot.

## Source expressions and why allowlists leak

A source list mixes host sources (`https://cdn.example.com`, `*.example.com`,
a bare scheme like `https:` or `data:`) with keyword sources in quotes:
`'self'`, `'none'`, `'unsafe-inline'`, `'unsafe-eval'`, `'wasm-unsafe-eval'`,
`'strict-dynamic'`, `'nonce-<value>'`, `'sha256-<value>'`, `'unsafe-hashes'`,
`'report-sample'`. `'self'` matches same-origin URLs and never applies to
inline content. Host sources with a leading `*.` match strict subdomains,
not the bare domain itself.

For years the standard advice was "allowlist the hosts you trust" --
`script-src 'self' https://cdn.example.com`. That advice is now considered
weak, for a structural reason: an allowlisted host almost always serves
*something* an attacker can abuse. A JSONP endpoint on that CDN turns into
an arbitrary-script loader (`?callback=alert(1)//`). An old Angular
bundle on that host can be coerced into evaluating attacker-controlled
expressions. An open redirect anywhere on the allowlisted origin lets an
attacker's script get served *from* a URL your policy trusts. Every one of
these is a real, catalogued bypass technique (Google's CSP Evaluator
flags all three), and every one only exists because the policy trusts a
*host* rather than a *piece of script the developer actually wrote*.

## The modern default: nonce or hash, plus strict-dynamic

Instead of trusting hosts, trust specific scripts. A nonce is a
per-response random token echoed on the elements you intend to run:
`script-src 'nonce-r4nd0m'` in the header, `<script nonce="r4nd0m">` in the
HTML. A hash (`'sha256-<base64 digest>'`) does the same for content that
never changes between requests. Either one lets you drop host allowlisting
almost entirely, but a nonced/hashed policy alone still has a gap: any
script your trusted script loads dynamically (a tag manager pulling in
a vendor script, a chunk-loader fetching another bundle) has no nonce of
its own and would be blocked. `'strict-dynamic'` closes that gap: it tells
the browser to trust scripts created by an already-trusted (nonced/hashed)
script, regardless of their own URL, while making the browser **ignore
any host or scheme sources** in that same directive -- so a policy that
combines `'strict-dynamic'` with a legacy `https:` fallback still blocks
non-nonced parser-inserted scripts, only degrading gracefully for
browsers old enough not to understand `'strict-dynamic'` at all. This
shape --

```
script-src 'nonce-...' 'strict-dynamic'; object-src 'none'; base-uri 'none'
```

-- is Google's and web.dev's standing recommendation for a strict CSP in
2026.

`'unsafe-inline'` deserves one precise rule, because it's the source of
most "why doesn't this policy do anything" confusion: **if a `script-src`
(or `style-src`) directive contains any `'nonce-...'` or `'sha...'` source,
`'unsafe-inline'` in that same directive is ignored entirely** -- browsers
that understand nonces/hashes also understand this rule, so pairing
`'unsafe-inline' 'nonce-r4nd0m'` isn't "allow inline OR require a nonce,"
it's "require the nonce," with the plain `'unsafe-inline'` there only for
browsers too old to parse nonces at all. `object-src 'none'` and
`base-uri 'none'` round out the strict template: `object-src` closes off
plugin-based execution paths that predate `script-src` entirely, and
`base-uri 'none'` stops an injected `<base href="https://evil.example">`
from silently rewriting every relative URL on the page, nonce or no nonce.
`require-trusted-types-for 'script'` (paired with `trusted-types 'default'`
or a named policy list) adds the enforcement half of Trusted Types from
the previous lesson: once set, the browser refuses to assign a plain
string to `innerHTML` and similar sinks anywhere on the page, closing the
gap left by a future unsanitized call site.

## Reading a violation report

A blocked load produces a report -- to the browser console always, and as a
JSON report body when `report-to` is configured (next lesson step) -- with
an `effectiveDirective` (which directive actually blocked it, after
fallback resolution) and a `blockedURL` that's either a real URL, or the
literal string `"inline"` for inline script/style, or `"eval"` for a
blocked `eval`/`new Function` call. Those two fields are enough to triage
almost every violation: `inline` means "needs a nonce or hash," `eval`
means "needs a refactor or `'wasm-unsafe-eval'`," and a URL means "decide
whether to allowlist it or remove it."

## Further reading

- [web.dev: Mitigate cross-site scripting (XSS) with a strict Content Security Policy](https://web.dev/articles/strict-csp)
- [MDN: Content-Security-Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy)
- [MDN: CSP source values](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/Sources)
- [W3C CSP Level 3: strict-dynamic](https://www.w3.org/TR/CSP3/#strict-dynamic-usage)
