The `directives` array is built with a literal string for `base-uri`.
Change `"base-uri 'self'"` to `"base-uri 'none'"` -- the strict template
never lets anything set `<base href>`, not even a same-origin script.

---

Inside the `if (options.trustedTypes)` block, add a line pushing
`"require-trusted-types-for 'script'"` *before* the existing
`directives.push("trusted-types 'default'")` line -- both directives are
required together; `trusted-types` alone names a policy but enforces
nothing.

---

In `summarizeReports`, the line `const key = report.effectiveDirective;`
only looks at one field. Combine both fields into the key, e.g.
`` `${report.effectiveDirective}|${report.blockedURL}` `` -- any separator
that can't appear inside either field works.
