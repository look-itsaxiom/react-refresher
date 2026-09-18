`createComponent` just needs `Object.keys(config.variants)` iterated in order, building up
an array of class strings you `.join(' ')` at the end. Resolve each variant's value with
`props?.[key] ?? config.defaults?.[key]`, then check
`config.variants[key][value] !== undefined` before pushing — that check is what makes an
unknown value silently produce nothing instead of `undefined` ending up in your class
string.

---

For the compound step, keep a small `resolved: Record<string, string>` map as you go
through the variants loop (even when a variant contributes no class, still record what it
resolved to). A compound rule applies when
`Object.entries(rule.when).every(([k, v]) => resolved[k] === v)`.

---

For `dedupeUtilities`, build a reverse lookup first: `Map<className, groupName>` from the
`conflicts` object. Then do two passes over the split class list — one to find the last
index at which each group's winner appears, one to build the output keeping only classes
whose index matches their group's winning index (or that aren't in any group at all).

---

For `Button`, call `createComponent(...)` once at module scope (not inside the component
function) so its identity is stable, then inside `Button` call the composed function with
the incoming props, pass the result through `dedupeUtilities` with your padding conflict
group, and set that as the rendered `<button>`'s `className`.
