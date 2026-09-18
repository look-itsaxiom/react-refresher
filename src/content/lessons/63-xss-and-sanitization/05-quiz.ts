import type { QuizStep } from '../../types';

export const quiz: QuizStep = {
  kind: 'quiz',
  id: 'xss-and-sanitization-quiz',
  title: 'Quiz: XSS and sanitization',
  questions: [
    {
      id: 'jsx-text-vs-html',
      prompt:
        'A component renders `<p>{comment.body}</p>` where `comment.body` is `"<b>hi</b>"`, straight from user input. What actually happens, and is there an XSS risk here?',
      choices: [
        { id: 'a', text: 'The browser renders bold "hi" text -- React interprets any string that looks like HTML as markup.' },
        {
          id: 'b',
          text:
            'The literal text `<b>hi</b>` is displayed on the page, angle brackets and all -- React sets this as a text node via its escaping path, not as `innerHTML`, so no XSS risk exists here regardless of what the string contains.',
        },
        { id: 'c', text: 'React throws a runtime error because the string contains HTML-looking characters.' },
        { id: 'd', text: 'It depends on whether `comment.body` came from the server or the client.' },
        { id: 'e', text: 'It only renders as markup if the string is longer than 100 characters.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'JSX expression children go through React\'s text-escaping path unconditionally -- the string is set as a text node, so `<`/`>` show up literally rather than being parsed as markup. This is exactly why "XSS in React" is almost always about `dangerouslySetInnerHTML`, URL attributes, spread props, or DOM APIs used directly -- not plain `{value}` interpolation.',
    },
    {
      id: 'regex-sanitizer-mxss',
      prompt:
        'A teammate proposes sanitizing user HTML with `html.replace(/<script[^>]*>.*?<\\/script>/gi, \'\')` plus a few more regexes for other dangerous tags, instead of pulling in a library. What is the concrete, structural problem with this approach (not just "it might miss a case")?',
      choices: [
        { id: 'a', text: 'Regex is too slow for production use at any real traffic volume.' },
        {
          id: 'b',
          text:
            'The regex operates on the raw string, but the browser will re-parse that string with its own HTML parser -- which applies rules (foreign content, malformed-tag recovery, attribute quirks) the regex knows nothing about, so a string that looks inert to the regex can be parsed by the browser into something dangerous. This is the mutation-XSS failure mode, and no amount of additional regex patches fixes the structural mismatch.',
        },
        { id: 'c', text: 'Regexes cannot contain the word "script" for security reasons in most JS engines.' },
        { id: 'd', text: 'It works correctly but only in Chrome, not Firefox or Safari.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'A sanitizer needs to filter the same tree the browser\'s HTML parser will build, which is why DOM-based sanitizers (DOMParser + tree walk, or DOMPurify) resist mutation XSS in a way string transforms structurally cannot -- the regex sees the input string, not the DOM the browser derives from it.',
    },
    {
      id: 'href-scheme-validation',
      prompt:
        'A profile-links feature renders `<a href={user.website}>`, where `user.website` is free text the user typed into a "Website" field, HTML-escaped by React like any other attribute. Is escaping sufficient here?',
      choices: [
        { id: 'a', text: 'Yes -- React escapes the attribute value, so any dangerous content is neutralized.' },
        {
          id: 'b',
          text:
            'No -- attribute escaping neutralizes characters like quotes that would break out of the attribute, but does nothing about the URL\'s *scheme*. A value of `javascript:alert(1)` is a perfectly valid, fully-escaped attribute value that still executes as script when the link is clicked.',
        },
        { id: 'c', text: 'No, but only because React 19 does not escape href attributes at all.' },
        { id: 'd', text: 'Yes, as long as Content-Security-Policy is configured on the page.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'Encoding and scheme validation are different jobs. Escaping stops a value from breaking out of its syntactic context (e.g., closing the attribute early); it says nothing about whether the value\'s *meaning*, once parsed as a URL, is safe to navigate to or embed. `javascript:`/`data:`/`vbscript:` schemes need an explicit allowlist check (`new URL(value).protocol`), independent of any escaping that already happened.',
    },
    {
      id: 'spread-props-risk',
      prompt:
        'A component does `<div {...apiCard.attrs}>{apiCard.title}</div>`, where `apiCard` comes from a third-party content API and `attrs` is meant to carry things like `data-testid`. Why is this a real XSS-adjacent risk even though nothing here looks like `dangerouslySetInnerHTML`?',
      choices: [
        { id: 'a', text: "It isn't a real risk -- spreading props is a pure React idiom with no DOM implications." },
        {
          id: 'b',
          text:
            'React attribute escaping protects the *values* it\'s given for named props, but a spread lets the data source choose the *attribute names* too -- if `attrs` can contain `onClick`, `onMouseOver`, or a crafted `style`, those reach the DOM as live event handlers or CSS injection, with no dangerouslySetInnerHTML anywhere in the component.',
        },
        { id: 'c', text: 'It is only a risk in class components, not function components.' },
        { id: 'd', text: 'It is a risk only if `apiCard.title` is also user-controlled.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'Spreading an untrusted object onto a DOM element hands the data source control over which props get set, not just their values. The fix is either not spreading it at all, or spreading only after picking specific known-safe keys explicitly -- there is no generic "sanitize an arbitrary props object" operation the way there is for HTML strings.',
    },
    {
      id: 'trusted-types-value-add',
      prompt:
        'A team already sanitizes every known `dangerouslySetInnerHTML` call site with DOMPurify. A security reviewer still recommends adding a CSP `require-trusted-types-for \'script\'` policy. Given the sanitization is already correct, what does Trusted Types actually add?',
      choices: [
        { id: 'a', text: 'Nothing measurable -- it is redundant once every sink is already sanitized correctly.' },
        {
          id: 'b',
          text:
            "It changes the failure mode from 'a missed or newly-introduced unsanitized sink is a live vulnerability until someone notices' to 'the browser refuses to assign a plain string to that sink at all,' catching a new dangerouslySetInnerHTML call, a dependency update that adds an innerHTML write, or a future engineer's mistake -- without relying on every future code change remembering the discipline.",
        },
        { id: 'c', text: 'It replaces the need for a Content-Security-Policy entirely.' },
        { id: 'd', text: 'It only matters for server-side rendering, not client-side sinks.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'Sanitization correctness today doesn\'t guarantee sanitization correctness after the next dependency bump or the next engineer who adds a feature. Trusted Types turns "every call site must remember to sanitize" into a browser-enforced invariant: only values produced by a registered policy can reach `innerHTML` and similar sinks, so an unsanitized assignment throws instead of silently executing.',
    },
    {
      id: 'react-markdown-raw-html',
      prompt:
        'A project renders user-authored markdown with `react-markdown` and, later, someone adds the `rehype-raw` plugin so authors can drop in the occasional raw `<video>` embed the markdown syntax doesn\'t support. What changed about the security posture of that rendering pipeline, and what is the fix?',
      choices: [
        { id: 'a', text: 'Nothing changed -- react-markdown never renders raw HTML, with or without plugins.' },
        {
          id: 'b',
          text:
            'Adding `rehype-raw` turns the pipeline back into an HTML-rendering sink: react-markdown\'s default safety (no raw HTML passthrough) only applies before that plugin is added. Once raw HTML can flow through, the fix is adding `rehype-sanitize` (with an explicit allowlist) right behind it, the same discipline as any other rich-text sink.',
        },
        { id: 'c', text: 'The fix is to switch from react-markdown to dangerouslySetInnerHTML directly, which is safer.' },
        { id: 'd', text: 'This is only a risk if the markdown is stored in a database rather than typed live.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'react-markdown\'s default behavior -- no raw HTML passthrough -- is a real, meaningful default, not decorative. It stops being true the moment a plugin (`rehype-raw`) is added specifically to allow raw HTML, at which point the pipeline needs the same allowlist-based sanitization any other HTML-accepting field needs.',
    },
  ],
};
