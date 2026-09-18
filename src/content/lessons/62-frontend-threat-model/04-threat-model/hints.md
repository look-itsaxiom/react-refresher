`matchesRule` is one line: lowercase both sides and use `.includes`. Lowercasing only
`label` isn't enough if a rule's `match` string ever has mixed case (none currently do,
but lowercase both to be safe): `label.toLowerCase().includes(rule.match.toLowerCase())`.
---
For the main loop: nest a `for...of` over `points` and, inside it, a `for...of` over
`THREAT_CATALOG`. Guard with `if (!matchesRule(point.label, rule)) continue;` so you only
push a `Threat` when the rule actually applies. Don't `break` after the first match —
a point can legitimately match more than one rule (a URL-shaped entry point is both a
tampering risk generically and might match a more specific rule too).
---
Build the `Threat` object with `risk: rule.likelihood * rule.impact` computed inline,
then `threats.push(...)` it inside the inner loop.
---
The final sort is `threats.sort((a, b) => b.risk - a.risk)` — descending by risk. Do
this once, after both loops finish, and return the sorted array (or sort in place and
return `threats`, either works).
