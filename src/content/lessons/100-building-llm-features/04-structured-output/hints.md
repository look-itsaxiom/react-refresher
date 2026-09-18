Write a small recursive `validateAgainst(schema, value, path)` that returns an array of error
strings (empty means valid) — `object` recurses into `properties` and checks `required`; `array`
recurses into `items` for every element; `enum` checks membership; everything else checks
`typeof`. Reuse it for both the direct-parse attempt and the post-repair attempt.

---

For the repair pass, do the fence-stripping and trailing-comma removal with two small regexes,
then find the first `{` and, scanning forward while tracking string state (so a `}` inside a
string literal doesn't count), find its matching `}`.

---

For `partialJson`, track two things while scanning left to right: whether you're inside a string
(toggle on unescaped `"`, skip the next character after a `\`), and a stack of open `{`/`[`. At
the end, if still inside a string, append a closing `"`. Then strip a trailing `,` or a trailing
`"key":` (with optional whitespace) via regex. Then close the stack in reverse order before
calling `JSON.parse`.

---

`estimateCost`: `cachedInputTokens` is a subset of `inputTokens`, not additional — the "fresh"
input token count billed at the normal rate is `inputTokens - cachedInputTokens`.

---

`renderModelOutput`: escape `&`, `<`, `>`, `"` first. Then run your markdown substitutions in
this order — links, then bold, then italic, then code — so a bold marker inside a link label
isn't mistaken for something else. Match links only against `https://` URLs; anything else
(`javascript:`, `http://`, a bare word) simply won't match the link pattern and stays as
escaped, inert text.
