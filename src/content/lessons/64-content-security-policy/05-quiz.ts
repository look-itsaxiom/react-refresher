import type { QuizStep } from '../../types';

export const quiz: QuizStep = {
  kind: 'quiz',
  id: 'content-security-policy-quiz',
  title: 'Quiz: Content Security Policy',
  questions: [
    {
      id: 'jsonp-allowlist-bypass',
      prompt:
        "A policy reads `script-src 'self' https://cdn.example.com`. A security review flags this as bypassable even though `cdn.example.com` is a CDN the team fully controls and trusts. What is the concrete bypass, and what does the recommended fix change?",
      choices: [
        { id: 'a', text: 'There is no real bypass here; the reviewer is being overly cautious about a trusted first-party CDN.' },
        {
          id: 'b',
          text:
            "If anything served from cdn.example.com can be coerced into executing attacker-controlled code -- a JSONP endpoint invoked with `?callback=alert(1)//`, an old Angular bundle that evaluates expressions, or an open redirect anywhere on that origin -- the policy trusts that host unconditionally, so the bypass rides in on infrastructure the team already trusts. Switching to a nonce or hash trusts a specific script the developer wrote, not everything an origin happens to serve.",
        },
        { id: 'c', text: 'The bypass only matters if cdn.example.com is served over HTTP instead of HTTPS.' },
        { id: 'd', text: "'self' is the actual problem here, and removing it would fix the policy." },
      ],
      correctChoiceId: 'b',
      explanation:
        "Host allowlisting trusts everything an origin can ever be made to serve, including things nobody intended to allow (JSONP callbacks, legacy framework eval sinks, open redirects). A nonce or hash sidesteps this by trusting a specific piece of script content instead of a whole origin, which is why it doesn't inherit whatever else that origin happens to host.",
    },
    {
      id: 'unsafe-inline-with-nonce',
      prompt:
        "A directive reads `script-src 'nonce-r4nd0m' 'unsafe-inline' 'strict-dynamic' https:;`. An inline `<script>` on the page has no `nonce` attribute at all. Does `'unsafe-inline'` let it run in a browser that supports nonces?",
      choices: [
        { id: 'a', text: "Yes -- 'unsafe-inline' unconditionally allows any inline script regardless of other sources in the directive." },
        {
          id: 'b',
          text:
            "No -- per the CSP spec, once a directive contains any nonce or hash source, browsers that understand nonces/hashes ignore 'unsafe-inline' in that same directive entirely. It's there only as a fallback for browsers too old to parse nonce sources at all, not as an alternate way to allow unnonced content.",
        },
        { id: 'c', text: "Yes, but only if 'strict-dynamic' is also present, since strict-dynamic re-enables unsafe-inline." },
        { id: 'd', text: "No, because 'https:' in the same list disables unsafe-inline." },
      ],
      correctChoiceId: 'b',
      explanation:
        "This is the single most common source of \"why is my CSP not doing anything\" confusion. A nonce/hash source and 'unsafe-inline' in the same directive isn't an OR; modern browsers drop 'unsafe-inline' the moment a nonce or hash is present, treating it as legacy-browser fallback only.",
    },
    {
      id: 'strict-dynamic-parser-inserted',
      prompt:
        "Policy: `script-src 'nonce-r4nd0m' 'strict-dynamic'`. Page A has `<script nonce=\"r4nd0m\">loadVendorScript()</script>` where `loadVendorScript` creates a new `<script src=\"https://vendor.example/x.js\">` element via `document.createElement` and appends it. Page B has a second, separate `<script src=\"https://vendor.example/x.js\">` tag written directly in the HTML with no nonce. Which one runs?",
      choices: [
        { id: 'a', text: 'Neither -- strict-dynamic only ever allows nonced scripts, full stop.' },
        { id: 'b', text: 'Both -- strict-dynamic allows any script from vendor.example once the domain has been referenced once.' },
        {
          id: 'c',
          text:
            "Only the dynamically-inserted one (Page A). It was created by script that already carries a valid nonce, so strict-dynamic extends trust to it regardless of its own URL. Page B's tag is parser-inserted directly from the HTML with no nonce of its own and no trusted script vouching for it, so it's blocked -- and strict-dynamic's suppression of host allowlists means even adding vendor.example to the directive wouldn't rescue it.",
        },
        { id: 'd', text: "Only Page B, because parser-inserted scripts are always trusted under strict-dynamic." },
      ],
      correctChoiceId: 'c',
      explanation:
        "strict-dynamic's whole purpose is propagating trust from a script you vouched for (via nonce or hash) to scripts *that script* creates, without needing to allowlist their hosts. A script written directly into the HTML has no such chain of trust and needs its own nonce or hash -- there's no host-allowlist escape hatch once strict-dynamic is in the directive.",
    },
    {
      id: 'object-src-fallback',
      prompt:
        'A team ships `default-src \'self\'; script-src \'nonce-r4nd0m\' \'strict-dynamic\';` with no `object-src` directive at all. Is `<object>`/`<embed>` loading restricted on this page, and by what?',
      choices: [
        { id: 'a', text: "It's completely unrestricted, since only script-src and default-src were set." },
        {
          id: 'b',
          text:
            "It falls back to default-src 'self', since object-src wasn't set at all and default-src covers any directive that's absent. That's weaker than the strict template's explicit object-src 'none', which exists because plugin-based content types predate script-src's protections and can be abused independently of anything script-src blocks.",
        },
        { id: 'c', text: "It's restricted by script-src, since object-src falls back to script-src, not default-src." },
        { id: 'd', text: "It's blocked entirely, because object-src always defaults to 'none' when unset." },
      ],
      correctChoiceId: 'b',
      explanation:
        "default-src is the fallback for any directive that's missing entirely -- object-src wasn't set, so it inherits 'self' from default-src rather than being unrestricted or defaulting to 'none'. The strict template sets object-src 'none' explicitly specifically because relying on the default-src fallback here is weaker than actually closing off plugin content.",
    },
    {
      id: 'meta-tag-frame-ancestors',
      prompt:
        "A fully static site with no server-side logic sets `<meta http-equiv=\"Content-Security-Policy\" content=\"frame-ancestors 'none'\">` in every page's `<head>`, expecting it to stop the site from being framed by other origins. Does it work?",
      choices: [
        { id: 'a', text: "Yes -- meta http-equiv is fully equivalent to the response header for every CSP directive." },
        {
          id: 'b',
          text:
            "No -- frame-ancestors (along with report-to/report-uri and sandbox) is not honored in a meta tag at all. It governs how the response itself may be framed, which has to be decided before the document, and its meta tags, are even parsed -- it requires the real HTTP response header, so a static host with no server logic needs a different mechanism (e.g. a CDN edge rule) to set it.",
        },
        { id: 'c', text: 'Yes, but only in Chromium-based browsers; Firefox and Safari ignore meta CSP entirely.' },
        { id: 'd', text: "No, because meta tags can't contain the word 'frame-ancestors' for security reasons." },
      ],
      correctChoiceId: 'b',
      explanation:
        "Some CSP directives are decided too early in the load process to be affected by anything inside the document -- frame-ancestors decides whether the response is even allowed to render inside a frame, before its own <meta> tags could possibly be parsed. Those directives need the real response header (or an equivalent header-level mechanism like an edge/CDN rule), full stop.",
    },
    {
      id: 'report-only-eval-triage',
      prompt:
        "A Report-Only rollout surfaces a violation: `effectiveDirective: 'script-src-elem'`, `blockedURL: 'eval'`, coming from a charting library the team depends on. Before deciding how to fix it, what is the one thing worth checking first, and why does it change the fix?",
      choices: [
        { id: 'a', text: "Nothing to check -- any eval violation should always be fixed by adding 'unsafe-eval' to script-src." },
        {
          id: 'b',
          text:
            "Whether the library's eval call is genuine dynamic code evaluation or WebAssembly module compilation reported through the same eval-blocking mechanism. If it's real eval on developer- or user-controlled strings, the fix is refactoring away from it (or, failing that, accepting the risk of 'unsafe-eval'); if it's WASM compilation, the narrower 'wasm-unsafe-eval' source covers it without reopening arbitrary string-to-code evaluation.",
        },
        { id: 'c', text: "Whether the report came from Chrome or Firefox, since eval violations are only real in Chrome." },
        { id: 'd', text: 'Whether the library is open source, since only open-source eval calls are safe to allow.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "'unsafe-eval' and 'wasm-unsafe-eval' both silence an eval-blocked violation, but they reopen very different amounts of risk: the first allows arbitrary string-to-code evaluation anywhere on the page, the second allows only WebAssembly module compilation. Confirming which one a given blockedURL: 'eval' report actually represents is what tells you whether the narrow fix applies.",
    },
  ],
};
