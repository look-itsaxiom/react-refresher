# How modules actually load

You've written `import`/`export` for years. What's less obvious is what the browser and
the engine actually do with those statements before your code runs — and that mechanics
gap is where import maps, top-level await, and dynamic import all live.

## ESM is static, and that's the whole point

An ES module's `import`/`export` statements are parsed before any module body executes.
The engine builds the full dependency graph — every module a module imports, transitively —
resolves every specifier to a URL, fetches and parses each one, and only then starts
executing module bodies, leaves of the graph first. This is why imports are hoisted and
why `import` declarations can only appear at the top level: the engine needs to see the
whole shape of the graph statically, without running any code, to do this in one pass.

Two consequences follow directly:

- **Live bindings, not copied values.** `import { count } from './store.js'` doesn't copy
  `count`'s value at import time — it binds to the same location as `store.js`'s `count`,
  and re-reads it every time you access it after `store.js` reassigns it. CommonJS's
  `module.exports` is a plain object snapshot; a re-export in CJS captures whatever the
  value was at `require()` time, not afterward.
- **Cycles resolve to partially-initialized modules, not infinite loops.** If `a.js` and
  `b.js` import each other, the engine still only visits each module once. Whichever
  module executes second sees live bindings from the first that may not be initialized
  yet — reading a `const` before its declaration line throws (the temporal dead zone still
  applies inside a cycle), but reading a `function` declaration works because those hoist
  fully before any module body runs.

ESM modules are also implicitly strict mode — no `"use strict"` needed, no accidental
global assignment, `this` is `undefined` at the top level instead of the global object.

## Module scripts in the browser

`<script type="module" src="./app.js">` is not "`<script>` but for import syntax." It
changes execution semantics on its own:

- Module scripts **defer by default** — they run after the document is parsed, in order
  relative to other module scripts, without needing a `defer` attribute. Classic scripts
  block parsing unless you add `defer` or `async` yourself.
- Module scripts always fetch with CORS. A cross-origin module import without the right
  `Access-Control-Allow-Origin` header fails outright — there's no cross-origin classic-script
  fallback for modules.
- Module scripts run in strict mode and have their own top-level scope; declaring `x` at
  the top of a module script never creates `window.x`.
- `nomodule` was the migration shim for browsers that predated `type="module"` support
  (roughly pre-2018). Every browser you're shipping to in 2026 supports modules natively;
  `nomodule` only shows up now in legacy build output or when a project's bundler config
  hasn't been revisited in years.

## Dynamic `import()` and top-level await

`import()` is a function-like expression, usable anywhere (inside a conditional, inside a
handler, inside CommonJS), that returns a promise for the target module's namespace
object. It's the mechanism behind route-based code splitting: a bundler sees `import()`
calls as split points and emits separate chunks, fetched only when that call actually
runs.

Top-level `await` — awaiting a promise directly in a module body, no wrapping async
function — changed how the graph *executes*, not how it's built. The graph is still
resolved statically up front. But a module with a top-level `await` suspends its own
evaluation, which suspends everything downstream of it in evaluation order until the
awaited promise settles. A module that does `const config = await fetch('/config.json').then(r => r.json())`
at its top level means every module that imports it — directly or transitively — waits
for that fetch before it finishes evaluating. This is useful for one-time async setup
(a WASM instance, a config fetch) and dangerous for anything that could be slow or fail
on the critical path of app startup.

## `import.meta` and import attributes

`import.meta.url` gives a module its own absolute URL — the standard way to resolve
sibling assets (`new URL('./data.json', import.meta.url)`) without hardcoding a base path.
`import.meta.resolve(specifier)` (widely supported in browsers and Node as of 2026) runs
the same specifier-resolution algorithm the engine itself uses — including import maps —
and hands back the resolved URL synchronously, without fetching it.

Import attributes (`import data from './config.json' with { type: 'json' }`) tell the
loader what kind of module to expect before it starts parsing, so a JSON file is parsed as
data rather than executed as script, and a mismatch is a load-time error rather than a
silent misinterpretation. CSS module scripts (`with { type: 'css' }`) work the same way in
browsers that implement the CSS Module Scripts spec — useful for shipping a stylesheet as
part of a module graph rather than a side-channel `<link>`. The older `assert` keyword from
early proposals is dead; `with` is the shipped syntax.

## Import maps: renaming the graph

Without an import map, every bare specifier (`import _ from 'lodash-es'`) is illegal in a
plain browser module graph — browsers only resolve relative and absolute URLs natively. An
import map, declared with `<script type="importmap">`, gives the browser a lookup table
so bare specifiers work without a build step:

```html
<script type="importmap">
{
  "imports": {
    "lodash-es": "https://esm.sh/lodash-es@4.17.21",
    "app/": "/src/"
  },
  "scopes": {
    "/vendor/": {
      "lodash-es": "https://esm.sh/lodash-es@3.10.1"
    }
  }
}
</script>
```

Three resolution rules matter:

1. **Exact bare matches** (`"lodash-es"`) map one specifier to one URL.
2. **Trailing-slash prefix matches** (`"app/"`) map a whole family of specifiers —
   `import x from 'app/utils/format.js'` resolves against the `app/` entry, with the
   remainder appended to the mapped URL. When more than one prefix entry could match, the
   longest matching key wins.
3. **Scopes** let a specifier resolve differently depending on which module is doing the
   importing. A scope's key is a URL prefix; if the importing module's URL starts with that
   prefix, that scope's map is consulted before falling back to the top-level `imports`
   map. This is how two different major versions of the same package can coexist in one
   graph — legacy vendor code gets the old version, everything else gets the new one.

A map entry's value can also be `null`, which explicitly blocks a specifier — useful for
preventing a subpath from resolving at all rather than silently falling through. Import
maps also support an `integrity` sibling key for subresource integrity hashes per mapped
URL, checked the same way a `<script integrity>` attribute would be.

## Further reading

- [WHATWG HTML — Resolve a module specifier](https://html.spec.whatwg.org/multipage/webappapis.html#resolve-a-module-specifier)
- [MDN — Import maps](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/script/type/importmap)
- [MDN — JavaScript modules](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules)
- [MDN — Import attributes](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import/with)
