Start with `parseSelectionSet`. The loop shape:
```
while (tokens[i] !== '}') {
  // figure out alias/name
  // figure out args
  // figure out nested selectionSet
  fields.push({ name, alias, args, selectionSet });
}
return [fields, i + 1];
```
For alias detection, check `tokens[i + 1] === ':'` *before* deciding how far to advance
`i` — that lookahead is what tells `id` (no alias) apart from `handle: name` (alias
`handle`, name `name`).
---
For args, remember `parseArgs` is already written and returns a tuple — don't
reimplement arg parsing here, just call it: `if (tokens[i] === '(') { const [parsedArgs,
next] = parseArgs(tokens, i); args = parsedArgs; i = next; }`. Default `args` to `{}`
before that check so a field with no `(...)` still gets an empty object.
---
For the nested selection set: `if (tokens[i] === '{') { const [nested, next] =
parseSelectionSet(tokens, i + 1); selectionSet = nested; i = next; }`. Passing `i + 1`
(not `i`) is what skips the `{` itself, matching how the top-level caller in
`parseQuery` does the same thing before its first call.
---
For `completeValue`, the list branch and the named branch both start with the same
null-check shape:
```
if (raw == null) {
  if (typeRef.nonNull) {
    errors.push({ message: `Cannot return null for non-nullable field "${fieldNode.name}"`, path });
    throw new NullBubble(path);
  }
  return null;
}
```
Write that once for the list case (checking `typeRef.nonNull` on the list wrapper) and
once for the named case (checking the named type's own `nonNull`) before handling the
non-null value.
---
For the list case's non-null value: `return (raw as unknown[]).map((item, index) =>
completeValue(schema, resolvers, typeRef.of, fieldNode, item, [...path, index],
variables, context, errors))`. For the named case's non-null value: if
`!fieldNode.selectionSet`, `return raw` directly (it's a scalar); otherwise recurse with
`executeSelectionSet(schema, resolvers, (raw as { __typename?: string }).__typename ??
typeRef.name, raw, fieldNode.selectionSet, path, variables, context, errors)`.
---
For `executeSelectionSet`, loop `selectionSet`, compute `responseKey` and `fieldPath` as
described, handle `__typename` first, then look up `fieldDef` and skip
(`result[responseKey] = null; continue;`) if it's missing. Call the resolver (or
`defaultResolve`), then:
```
try {
  result[responseKey] = completeValue(schema, resolvers, fieldDef.type, fieldNode, raw, fieldPath, variables, context, errors);
} catch (e) {
  if (e instanceof NullBubble) {
    if (fieldDef.type.nonNull) throw e;
    result[responseKey] = null;
  } else {
    throw e;
  }
}
```
That `if (fieldDef.type.nonNull) throw e` line is the entire bubbling mechanism — it's
what makes a `NullBubble` skip past every non-null ancestor until it finds one that's
allowed to absorb it.
