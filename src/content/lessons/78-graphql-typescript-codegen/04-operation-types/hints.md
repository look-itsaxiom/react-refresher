Start with `renderObjectFields` and `renderFieldType` together — they're mutually
recursive (a field's nested selection calls back into `renderObjectFields`, which calls
`renderFieldType` for each of its own fields), so write both signatures first and fill
bodies in either order.
---
In `renderFieldType`, the `leaf` callback you pass to `typeRefToTs` receives the *named*
type's name with list-wrapping and nullability already stripped off — that's the whole
point of `typeRefToTs`'s design. Don't try to re-check `fieldNode`'s list-ness yourself;
just decide, given a bare type name, what string represents "one of those" and let
`typeRefToTs` handle wrapping it in `[]` / `| null` however many times the schema's
`TypeRef` says to.
---
For the union branch: `fieldNode.inlineFragments` is an array of `{ onType, selectionSet
}`. Each one renders as its own complete object literal via `renderObjectFields(...,
onType, ...)` — including its own `__typename: 'onType'` — so joining them with `' | '`
directly produces a valid discriminated union; you don't need to add anything extra
around the join.
---
`persistedDocumentId` is three lines: encode with `new TextEncoder().encode(text)`, await
`crypto.subtle.digest('SHA-256', bytes)`, then map each byte of `new
Uint8Array(digest)` through `b.toString(16).padStart(2, '0')` and `.join('')`.
`buildManifest` just loops `Object.values(documents)`, normalizes, awaits
`persistedDocumentId`, and assigns into the result object — the input keys are discarded.
