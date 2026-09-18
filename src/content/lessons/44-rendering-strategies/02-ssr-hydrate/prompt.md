# Build a real SSR + hydrate pipeline

This isn't a simulation — you'll use the actual `react-dom/server` and
`react-dom/client` APIs to render a component to an HTML string, hand that
string to the browser as if a server had sent it, and then hydrate it back
into a live component. This is the mechanism behind every SSR framework in
this lesson, minus the HTTP server.

You're given `Counter`, a component that takes `{ initialCount: number }`
and renders a count and an increment button:

```tsx
function Counter({ initialCount }: { initialCount: number }) {
  const [count, setCount] = useState(initialCount);
  return (
    <div>
      <p data-testid="count">{`Count: ${count}`}</p>
      <button onClick={() => setCount((c) => c + 1)}>Increment</button>
    </div>
  );
}
```

Implement two functions.

## `renderPage(App, props)`

Render `App` with `props` to an HTML string using `renderToString`, and
return a string containing two pieces, in order:

1. `<div id="root">...</div>` — the rendered markup, exactly as
   `renderToString` produced it.
2. `<script id="__PROPS__" type="application/json">...</script>` — `props`
   serialized as JSON.

This mirrors what an SSR framework actually sends: the rendered HTML, plus
the data needed to hydrate it, embedded in the document so no extra request
is needed on the client.

**The escaping rule that matters:** a value inside `props` could contain
the literal string `</script>`, which would close your script tag early and
let arbitrary HTML/script content run — a real, historical XSS vector in
hand-rolled SSR pipelines. Before embedding the JSON, replace every `<`
character with `<`. `JSON.parse` reads `<` back as `<` correctly
(it's a valid JSON escape for any character), so the data round-trips
unchanged; only the literal byte that could break out of the script tag is
gone.

## `hydrate(container, onRecoverableError?)`

Given a `container` element whose `innerHTML` was already set to a string
`renderPage` produced (simulating the browser having received that HTML
from the server):

1. Read the `#__PROPS__` script's text content and `JSON.parse` it.
2. Find the `#root` element inside `container`.
3. Call `hydrateRoot(root, <Counter {...props} />, ...)`, passing
   `onRecoverableError` through in the options object when it's provided
   (so callers can observe hydration mismatches instead of only seeing them
   logged to the console).

`hydrateRoot` reuses the DOM nodes already in `root` — that's the entire
point of hydration, distinguishing it from `createRoot`, which would tear
down that HTML and render fresh. Do not clear `root`'s contents yourself
before calling `hydrateRoot`.

The default export renders the HTML string in a `<pre>` so you can see
exactly what a server would have sent, then hydrates a second copy live
into a `<div>` below it — click its button to confirm the counter actually
works after hydration.
