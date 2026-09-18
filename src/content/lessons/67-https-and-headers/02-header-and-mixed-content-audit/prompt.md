# Audit the headers and the mixed content

`App.tsx` has two working functions with real bugs, one bug in each. The
overall shape and most branches are already right — use them as the
reference for what "right" looks like.

## 1. `auditHeaders(headers, { isHttps })`

Given a lowercase-keyed header map and whether the page is served over
HTTPS, return a scorecard: `{ grade, findings }`, where each finding is
`{ header, status: 'pass' | 'warn' | 'fail', fix }`.

Seven findings are produced, always in this order: `Strict-Transport-Security`,
`X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`,
`Framing protection`, `Cross-origin isolation`, `Server disclosure`.

Grading table (already implemented correctly — don't change it): each
`pass` is worth 2 points, each `warn` 1, each `fail` 0, summed across all
seven findings (14 possible), then:

| score | grade |
| --- | --- |
| 13-14 | A |
| 10-12 | B |
| 7-9 | C |
| 4-6 | D |
| 0-3 | F |

**The bug:** the `Strict-Transport-Security` finding checks `max-age` but
never checks `includeSubDomains`. A header like
`max-age=63072000` (no `includeSubDomains`) is currently marked `pass`. It
should be `warn` — a long `max-age` without `includeSubDomains` still
leaves every subdomain exposed to the first-request gap HSTS exists to
close. Every other finding (including the rest of the HSTS branch, when
`includeSubDomains` *is* missing for a different reason, or when the page
isn't HTTPS at all) is already correct.

## 2. `mixedContent(pageUrl, resources)`

Given the page's URL and a list of `{ url, type }` resources
(`type` is `'script' | 'style' | 'fetch' | 'img' | 'audio' | 'video'`),
classify each one as `'secure'` (already `https://`, or the page itself
isn't `https://` so mixed-content rules don't apply), `'upgradable'`
(passive content — `img`/`audio`/`video` — that browsers auto-upgrade to
`https://` and only block if the upgrade fails), or `'blocked'` (active
content — `script`/`style`/`fetch` — that's blocked outright, no upgrade
attempt).

**The bug:** the list of auto-upgradable types is missing `'video'`, so an
`http://` video on an `https://` page is currently classified `'blocked'`
instead of `'upgradable'`. `img` and `audio` are already handled
correctly.

Fix both bugs and every check should pass.
