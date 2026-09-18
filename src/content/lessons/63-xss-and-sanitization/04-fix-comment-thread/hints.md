Three independent fixes, in the render for each comment `c`. None of them require touching `sanitizeHtml` or `isSafeUrl`.

---

For the body: `<div dangerouslySetInnerHTML={{ __html: sanitizeHtml(c.bodyHtml) }} />`. `dangerouslySetInnerHTML` itself is fine here -- it's the *unsanitized* input that was the bug, not the prop.

---

For the link: check `isSafeUrl(c.profileUrl)` before deciding what to render. If it's safe, render `<a href={c.profileUrl}>{c.author}</a>`. If it's not, render `{c.author}` (or wrap it in a `<span>`) with no `href` at all -- don't render an `<a>` with a `javascript:` href, and don't strip just the scheme and keep the rest of the string as if it were still a URL.

---

For the meta spread: delete `{...c.meta}` entirely. There is no requirement to preserve anything from `meta` for this exercise -- an API-controlled attribute bag with no allowlist has no safe subset you can spread blindly.

---

Full shape of one list item:

```tsx
<li key={c.id}>
  {isSafeUrl(c.profileUrl) ? (
    <a href={c.profileUrl}>{c.author}</a>
  ) : (
    <span>{c.author}</span>
  )}
  <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(c.bodyHtml) }} />
</li>
```
