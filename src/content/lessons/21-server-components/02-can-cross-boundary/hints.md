Handle primitives first with a plain `typeof` check — `string`, `number`,
`boolean`, `bigint`, plus `null`/`undefined` — those are always `true`.

---

For symbols, `Symbol.keyFor(value)` returns the registration key for a
symbol created with `Symbol.for(...)`, and `undefined` for any other symbol
(including well-known symbols and locally-created ones). That's exactly the
`true`/`false` split you need.

---

For functions, don't try to detect "is this a Server Function" by
inspecting its source — check the two marker symbols the starter already
attaches (`SERVER_FUNCTION_MARKER`, `CLIENT_REFERENCE_MARKER`) as properties
on the function object. Any function without either marker is `false`.

---

For the object cases, check the specific built-ins (`isValidElement`,
`instanceof Promise`, `instanceof Date`, `ArrayBuffer.isView` /
`instanceof ArrayBuffer`) before falling through to the generic "is this a
plain object or array" branch — order matters because e.g. a `Date` would
otherwise fall into the "walk its properties" path and give the wrong
answer.

---

For plain objects, `Object.getPrototypeOf(value) !== Object.prototype`
catches both class instances and `Object.create(null)` objects in one
check — both have a prototype that isn't `Object.prototype`. Once you've
confirmed it's a plain object, recurse into `Object.values(value)` (and for
arrays, `Array.prototype.every`) so a bad value nested three levels deep
still fails the whole thing, matching how a single unserializable prop
value breaks React's real check.
