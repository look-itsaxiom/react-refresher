`App.tsx` gives you a simplified `WebpackConfig` shape and asks you to finish
`migrateWebpackConfig`, which maps the parts that translate directly into an
equivalent `ViteConfig`, and produces a `notes` array for the parts that don't.

## The four direct mappings

- **`resolve.alias`** → copy it as-is onto `vite.resolve.alias`. The shape is
  identical between the two tools.
- **`definePlugin`** → this stands in for `new webpack.DefinePlugin({...})`. Its
  values are raw JS values (a string, a boolean, ...); Vite's `define` substitutes raw
  *code* at each reference, so every value needs `JSON.stringify` around it before
  landing in `vite.define` — a string value has to become a JSON string literal
  (`'"https://api.example.com"'`), not the bare string, or it would splice invalid
  syntax into the build.
- **`devServer.proxy`** → copy it as-is onto `vite.server.proxy`.
- **`output.publicPath`** → copy the string as-is onto `vite.base`. No
  `JSON.stringify` here — `base` is an ordinary string config value, not code.

Only set a `ViteConfig` field when the corresponding webpack field is present —
`vite.resolve`, `vite.define`, `vite.server`, and `vite.base` should all be `undefined`
(simply omitted) when there's nothing to map.

## The notes

Some webpack config has no Vite config equivalent at all — it becomes a manual
follow-up. Push one string onto `notes` for each of these that applies, in any
wording, as long as it includes the substring noted:

- `webpack.entry` is present → a note about Vite using `index.html` instead of a JS
  entry field.
- `webpack.resolve?.extensions` is present → a note that Vite has its own default
  extension list.
- `webpack.module?.rules` is present and non-empty → a note that css/svg loaders are
  automatic in Vite. The note's text must include `"css"` or `"svg"` (case-sensitive).
- `webpack.usesRequireContext` is `true` → a note that must include the exact text
  `"import.meta.glob"`.
- For every name in `envVarsUsed` that does **not** already start with `"VITE_"`: push
  one note per name. That note's text must include the exact text `"VITE_" +
  <name>` with no characters in between — e.g. for `"API_URL"` the note must contain
  `"VITE_API_URL"` somewhere in it. A name that already starts with `"VITE_"` (like
  `"VITE_ANALYTICS_ID"` in the sample data) needs no note at all.
