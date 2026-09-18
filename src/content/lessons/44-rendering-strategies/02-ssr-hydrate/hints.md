`renderToString` from `react-dom/server` takes a React element and returns
an HTML string synchronously — `renderToString(<App {...props} />)`. Wrap
that string in the `<div id="root">...</div>` shell.

---

For the props script, `JSON.stringify(props)` first, then
`.replace(/</g, '\\u003c')` on the resulting string before embedding it in
the template. Do this replacement on the JSON *string*, not on individual
prop values — you want every `<` in the final serialized text gone,
regardless of which field it came from.

---

For `hydrate`, `container.querySelector('#__PROPS__')` gets the script
element; its `.textContent` is the JSON text. `JSON.parse` it, then
`container.querySelector('#root')` gets the element to hydrate.
`hydrateRoot` comes from `react-dom/client`.

---

`hydrateRoot`'s signature is `hydrateRoot(domNode, reactNode, options?)`.
The options object takes `onRecoverableError`. Only pass an options object
when you actually have a callback — `hydrateRoot(root, node, options)`
where `options` is `onRecoverableError ? { onRecoverableError } : undefined`
works, and avoids passing `{ onRecoverableError: undefined }`, which some
callers check for with `if ('onRecoverableError' in options)`.

---

Full shape for `renderPage`:

```tsx
export function renderPage(App: ComponentType<any>, props: Record<string, unknown>): string {
  const html = renderToString(<App {...props} />);
  const json = JSON.stringify(props).replace(/</g, '\\u003c');
  return `<div id="root">${html}</div>\n<script id="__PROPS__" type="application/json">${json}</script>`;
}
```
