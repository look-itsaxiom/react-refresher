# Fix `CommentThread`

`CommentThread` renders API-returned comments and has three separate XSS
sinks. A working, complete `sanitizeHtml` (from the previous exercise) is
already included at the top of `App.tsx` -- don't modify it, just use it
correctly. `isSafeUrl` is also provided.

Fix all three:

1. **Rich-text preview.** `comment.bodyHtml` is rendered via
   `dangerouslySetInnerHTML` with no sanitization. Pass it through
   `sanitizeHtml` first.
2. **Profile link.** `comment.profileUrl` is a string the *comment's
   author* typed in (not validated by the API) and is used directly as
   `href`. Validate it with `isSafeUrl` before rendering it as a link;
   when it's not safe, render the author's name as plain text (no `<a>`
   at all, or an `<a>` with no `href`) instead of silently keeping an
   unsafe link.
3. **Spread props.** `<a {...comment.meta}>` spreads an API-controlled
   object directly onto a DOM element. `meta` is arbitrary key/value
   pairs the API asks the client to "attach" to the byline -- there's no
   guarantee it doesn't contain `onmouseover`, `style`, or anything else.
   Stop spreading it. If you want to keep something from `meta`, pick
   specific known-safe keys explicitly; for this exercise, just remove
   the spread.

Keep the benign comment (`c1`) rendering exactly as before: its author
name, its link, and its formatted body text should all still show up.

## Why this shape, specifically

Every one of these three sinks is common in real component code and
none of them looks like `eval`. A rich-text preview field, a
user-editable profile URL, and a metadata bag an API asks you to spread
onto an element are all things a reviewer can approve without noticing
the risk, because each is "just" a prop -- the risk is entirely in *how*
it's rendered, not in the component's shape.
