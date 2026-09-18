Look at the `else` branch after `if (maxAge < 31536000)` inside the
`Strict-Transport-Security` finding. Right now anything with a long enough
`max-age` falls straight through to `pass`. Add an `includeSubDomains`
check in that branch: parse it the same way `maxAge` is parsed (a regex
against the raw header string, case-insensitive), and if it's missing,
push a `warn` finding instead of `pass`.

---

The fix for `auditHeaders` is roughly: `const hasSubdomains =
/includesubdomains/i.test(hsts);` then change `else { push pass }` into
`else if (!hasSubdomains) { push warn } else { push pass }`.

---

For `mixedContent`, the bug is a one-word fix: `AUTOUPGRADE_TYPES` is
missing `'video'`. Add it to the array alongside `'img'` and `'audio'` —
no other logic needs to change.
