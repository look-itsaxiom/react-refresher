A `Feature` describes what you're about to ship: its `assets`, its `entryPoints`
(places untrusted input reaches it), its `trustBoundaries`, and any `thirdParty`
dependencies it pulls in. `THREAT_CATALOG` in `App.tsx` is a small STRIDE-style rule
table: each rule fires when an entry point's (or third-party item's) label contains a
given substring, and supplies the STRIDE category, a concrete control, and a
likelihood/impact pair.

Two things are left in `threatModel(feature)`:

## 1. `matchesRule(label, rule)`

Return whether `rule` applies to `label` — a case-insensitive substring check of
`rule.match` against `label`. `'search URL query param'` should match a rule whose
`match` is `'url'`; `'postMessage from embedded widget'` should match `'postmessage'`.

## 2. The body of `threatModel`

`points` is already assembled from every entry point plus every third-party item. For
each point, check it against every rule in `THREAT_CATALOG`. Every rule that
`matchesRule` returns `true` for becomes a `Threat`: `{ entryPointId: point.id,
category: rule.category, control: rule.control, likelihood: rule.likelihood, impact:
rule.impact, risk: rule.likelihood * rule.impact }`. A single point can match more than
one rule — push a separate `Threat` for each.

Finally, return the list sorted by `risk`, **highest first**. The default `App` renders
the ranked list for a sample feature.
