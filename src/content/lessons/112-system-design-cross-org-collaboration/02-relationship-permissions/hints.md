Write `check` as a recursive function with a `path: Set<string>` parameter (default
`new Set()`) and a `depth` parameter (default `0`). Build a key like `` `${relation}@${object}` ``
at the top of every call; if `path.has(key)`, return `false` immediately (cycle); if
`depth` exceeds a cap (say, 20), return `false` too. Otherwise add the key to a *copy* of
`path` (or add and don't worry about removing it — since the function is a pure boolean
search over a fixed subject, once a node resolves to `false` it's safe to treat it as `false`
for the rest of that top-level call) before recursing into unions or parent inheritance.

---

Split direct-tuple resolution into its own small step inside `check`: loop over `tuples`,
keep only ones matching `object` and `relation`. For each, if `t.subject === subject` you're
done (`true`). Otherwise, if `t.subject` contains `'#'`, split it into `[usersetObject,
usersetRelation]` and recurse: `check(schema, tuples, subject, usersetRelation,
usersetObject, ...)`.

---

For the `union` step, loop `relDef.union ?? []` and recurse `check(..., impliedRelation,
object, ...)` for each — same object, different relation. For the `parent` step, filter
`tuples` for `{ object, relation: parent.relation }`, and for each matching tuple's
`subject` (which is itself an object reference, e.g. `'org:1'`), recurse `check(...,
parent.via, thatOrg, ...)`.

---

`expand` mirrors `check`'s three steps, but instead of checking one target subject, it
collects a `Set<string>` of every subject it can resolve down to a concrete
(non-userset) string, unioning across direct tuples, unions, and parent inheritance. The
same cycle-guard `path`/`depth` machinery applies. Return `[...set].sort()`.

---

`visibleTasks` is a single `.filter()` over `tasks`. For each task, first check program
`viewer` access — if that fails, exclude the task regardless of `visibility`. Only check
`org-internal` membership when the task's `visibility` is `'org-internal'`; a `'program'`
task doesn't need the membership check at all once the viewer check passes.

---

Full shape for `check`:

```ts
function check(schema, tuples, subject, relation, object, path = new Set(), depth = 0) {
  const key = `${relation}@${object}`;
  if (depth > 20 || path.has(key)) return false;
  const nextPath = new Set(path).add(key);
  const objectType = object.split(':')[0];
  const relDef = schema[objectType]?.[relation];
  if (!relDef) return false;

  for (const t of tuples) {
    if (t.object !== object || t.relation !== relation) continue;
    if (t.subject === subject) return true;
    if (t.subject.includes('#')) {
      const [usObj, usRel] = t.subject.split('#');
      if (check(schema, tuples, subject, usRel, usObj, nextPath, depth + 1)) return true;
    }
  }

  for (const impliedRel of relDef.union ?? []) {
    if (check(schema, tuples, subject, impliedRel, object, nextPath, depth + 1)) return true;
  }

  if (relDef.parent) {
    for (const t of tuples) {
      if (t.object === object && t.relation === relDef.parent.relation) {
        if (check(schema, tuples, subject, relDef.parent.via, t.subject, nextPath, depth + 1)) return true;
      }
    }
  }

  return false;
}
```
