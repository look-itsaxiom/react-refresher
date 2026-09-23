# How XSS actually happens in React apps

React's JSX compiler escapes text children and attribute values by default.
`<p>{comment.body}</p>` can never inject markup -- React calls
`Text.escape`-equivalent logic and sets the result as a text node, not
`innerHTML`. That guarantee is real, and it is why plain JSX rendering is
not where XSS shows up in React codebases. It shows up in the handful of
places where you step outside that guarantee, on purpose or by accident.

## The three classes, with React-shaped examples

**Reflected XSS**: the payload comes in on the request (a query param, a
route segment, a search field) and is rendered back in the same response
or the same client render, unsanitized. In a React SPA this usually looks
like reading `location.search` or a route param and feeding it straight
into `dangerouslySetInnerHTML`, or into a URL attribute (`<a href={q}>`)
without validating the scheme.

**Stored XSS**: the payload was saved somewhere -- a comment, a display
name, a support ticket body -- and gets rendered to other users later,
often through a rich-text field that legitimately needs *some* HTML
(bold, links, lists). This is the case that actually needs a sanitizer,
because "just escape it" would break the legitimate formatting. It's also
the highest-value target: one stored payload executes for every viewer.

**DOM-based XSS**: the vulnerable sink and the untrusted source are both
in client-side JavaScript, with no server round-trip involved at all --
`element.innerHTML = new URLSearchParams(location.search).get('name')`,
or a client-side router that reads a hash fragment into a template
string. React doesn't protect you here any more than vanilla JS does,
because the moment you leave JSX for direct DOM APIs you're back to
manual sanitization.

**Mutation XSS (mXSS)** is a fourth thing worth naming separately: a
payload that looks inert when a sanitizer inspects it, but the *browser's
own HTML parser* rewrites it into something dangerous once it's inserted
into the DOM and then re-serialized (e.g., by `innerHTML` round-tripping
through `outerHTML`, or a rich-text editor re-reading its own contents).
This is why regex- or string-based sanitizers fail structurally: a
regex sees the string you feed it, not the string the browser will build
after its parser normalizes namespaces, unclosed tags, and foreign
content (SVG/MathML) rules. A sanitizer has to operate on the *parsed
DOM tree* -- same parser the browser will use -- and re-derive its output
from that tree, which is exactly what `DOMParser` plus a tree walk buys
you, and exactly what DOMPurify does internally.

## Where React's escaping has holes

- **`dangerouslySetInnerHTML`**. The name is the warning. Anything that
  reaches this prop as unsanitized HTML -- server-rendered markup,
  API-returned rich text, markdown converted to HTML yourself -- is a
  sink.
- **URL attributes with dangerous schemes**. `<a href={userUrl}>` and
  `<img src={userUrl}>` don't go through HTML-escaping logic that would
  stop a scheme like `javascript:` -- escaping quotes and angle brackets
  does nothing to a URL's *scheme*. React has logged a dev warning for
  `javascript:` URLs in `href` since 16.9, but as of React 19.3 it is
  still only a console warning, not a runtime block -- don't rely on it
  as a defense.
- **`srcDoc` and third-party iframes**. `<iframe srcDoc={html}>` renders
  arbitrary HTML with its own script execution context. Embeds
  (`dangerouslySetInnerHTML`-based widget SDKs, ad tags) are the same
  shape from your app's point of view: HTML you didn't write, executing
  in your page's origin unless you've sandboxed the iframe.
- **Spreading untrusted props**. `<div {...apiResponse.attrs}>` looks
  harmless -- it's not `dangerouslySetInnerHTML` -- but if `apiResponse`
  is attacker-influenced (a stored profile field the API echoes back
  verbatim as a props bag), it can carry `onClick`, `onMouseOver`, or a
  `style` value with a CSS injection. React attribute escaping doesn't
  gate *which* attribute names get set; it only escapes the values it's
  given for the names you asked for.
- **Rich-text and markdown rendering**. Any pipeline that turns
  user-authored markup into HTML and then renders that HTML is a stored
  XSS sink unless something in the pipeline sanitizes. `react-markdown`
  is the safe end of this spectrum by default (see the next section);
  a hand-rolled BBCode-to-HTML converter feeding `dangerouslySetInnerHTML`
  is the dangerous end.
- **SSR string interpolation outside React's renderer**. Anything built
  with a template literal on the server -- `` `<script>window.__DATA__=${json}</script>` ``
  -- bypasses React's escaping entirely, because it never touches React.
  Lesson 46 covers the specific fix for state serialization; the general
  rule is the same one as everywhere else on this page: untrusted data
  reaching an HTML string builder needs its own encoding pass.

## Sanitize, encode, validate: three different jobs

These get used interchangeably in casual conversation and that's part of
why sanitizers get misapplied. They are not interchangeable:

- **Encode** for a context: turn characters that are syntactically
  significant in that context into their inert representation, without
  removing meaning. HTML-encoding `<` to `&lt;` for a text node. This is
  what JSX does automatically. It's lossless and it's the right tool
  whenever you want the untrusted string to render as *itself* --
  visible text, not markup.
- **Sanitize**: given a string that's allowed to contain *some* markup,
  parse it and remove/rewrite the parts that aren't allowed, producing a
  smaller, safe HTML string. This is inherently lossy (disallowed tags
  and attributes are dropped) and it's the only correct tool when the
  input is expected to contain real markup you intend to render as
  markup.
- **Validate**: check that a value conforms to an expected shape and
  reject or fall back if it doesn't -- confirming a URL's scheme is
  `https:` before using it as `href`, or confirming a color string
  matches `^#[0-9a-f]{6}$` before using it in `style`. Validation doesn't
  transform the value; it's a gate.

Picking the wrong one is the recurring bug: encoding a value that's meant
to contain real markup breaks the feature (bold text renders as literal
`<b>` characters); sanitizing a value that's supposed to be plain text is
needless overhead and can still miss context-specific escaping (a
sanitized string is safe as HTML body content, not automatically safe
dropped into a `<script>` tag or a CSS `url()`); skipping validation on a
URL attribute lets a scheme-based attack through no matter how well the
rest of the string is encoded.

## Further reading (optional)

- [OWASP XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [OWASP DOM-based XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/DOM_based_XSS_Prevention_Cheat_Sheet.html)
- [PortSwigger: mutation XSS](https://portswigger.net/web-security/cross-site-scripting/dom-based/mutation-based)
- [React docs: `dangerouslySetInnerHTML`](https://react.dev/reference/react-dom/components/common#dangerously-setting-the-inner-html)
