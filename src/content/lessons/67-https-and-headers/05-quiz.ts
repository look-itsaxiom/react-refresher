import type { QuizStep } from '../../types';

export const quiz: QuizStep = {
  kind: 'quiz',
  id: 'https-and-headers-quiz',
  title: 'Quiz: HTTPS and security headers',
  questions: [
    {
      id: 'hsts-preload-risk',
      prompt:
        "A team adds `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` to their main domain and submits it to the HSTS preload list. Six months later, a new team wants to spin up a plain-HTTP internal tool on a subdomain of that same domain for a quick prototype. What happens?",
      choices: [
        { id: 'a', text: 'Nothing unusual — subdomains are unaffected unless they also opt in individually.' },
        {
          id: 'b',
          text:
            "It can't work as HTTP: includeSubDomains means every subdomain is covered by the preloaded rule, every major browser will refuse the HTTP connection outright, and getting the domain off the preload list (or removing includeSubDomains) takes weeks to propagate through browser release channels — this isn't a same-day fix.",
        },
        { id: 'c', text: 'It works fine over HTTP as long as the subdomain itself never sent an HSTS header.' },
        { id: 'd', text: 'preload only affects Chrome; the tool will work in Firefox and Safari.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'preload plus includeSubDomains is close to a permanent commitment for every current and future subdomain — it ships baked into the browser itself, not read live from your server, so undoing it is measured in browser release cycles, not a config change you can roll back immediately. Decide on it deliberately, and never enable includeSubDomains casually on a domain with unpredictable subdomains.',
    },
    {
      id: 'mixed-content-image-no-https',
      prompt:
        'An HTTPS page references `<img src="http://old-cdn.example.com/logo.png">`, and that CDN never set up HTTPS for this particular file. What does the browser actually do?',
      choices: [
        { id: 'a', text: 'Loads it over HTTP as a passive fallback, since images are considered low-risk.' },
        {
          id: 'b',
          text:
            'Tries the HTTPS version first (autoupgrade), and when that fails, blocks the image entirely rather than falling back to the insecure HTTP version — the image just fails to load.',
        },
        { id: 'c', text: 'Shows a one-time browser permission prompt asking the user whether to allow it.' },
        { id: 'd', text: 'Blocks the whole page from rendering until the resource is removed.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "Passive content (img/audio/video) gets an autoupgrade attempt, not a free pass to load over HTTP. If the HTTPS version doesn't exist, the browser blocks it rather than silently degrading security — the fix is making sure the HTTPS version actually exists, not assuming images are exempt from mixed-content rules.",
    },
    {
      id: 'sri-missing-crossorigin',
      prompt:
        'A `<script src="https://cdn.example.com/lib.js" integrity="sha384-...">` tag is missing the `crossorigin="anonymous"` attribute. What actually happens when the browser loads it?',
      choices: [
        { id: 'a', text: 'The integrity check is silently skipped, and the script loads and runs normally.' },
        {
          id: 'b',
          text:
            "The browser can't read the cross-origin response bytes to compute a hash without CORS permission, so it can't verify integrity at all — the script is blocked, not loaded unverified.",
        },
        { id: 'c', text: 'The browser falls back to checking the Content-Length header instead of a hash.' },
        { id: 'd', text: 'It only affects the console warning shown; the script still loads and executes.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "This fails closed, not open — a common assumption is that a missing crossorigin attribute just means \"the integrity check doesn't happen,\" but it actually means the script doesn't load at all. Reading cross-origin bytes for hashing is itself subject to CORS, independent of whether the hash would have matched.",
    },
    {
      id: 'permissions-policy-default',
      prompt:
        "A page embeds a third-party ad iframe and sets no Permissions-Policy header at all. A teammate worries this means the ad iframe can freely turn on the visitor's camera. Is that the actual risk of omitting the header?",
      choices: [
        {
          id: 'a',
          text:
            "No — most permission-gated features (camera, microphone, geolocation) already default to a 'self' allowlist, so a cross-origin iframe can't use them without both its own allow attribute AND an explicit top-level grant; omitting the header mainly means missing future-proofing and not opting out of things like the Topics API.",
        },
        { id: 'b', text: 'Yes — no header means every feature defaults to allowing any embedded origin.' },
        { id: 'c', text: 'It depends only on the iframe\'s own sandbox attribute, Permissions-Policy is irrelevant to iframes.' },
        { id: 'd', text: 'Omitting the header disables all gated features for everyone, including the top-level page.' },
      ],
      correctChoiceId: 'a',
      explanation:
        "The real risk of skipping Permissions-Policy is subtler than \"wide open\" — the default policy already restricts most sensitive features to the top-level origin. Setting the header explicitly is about documenting intent, covering features whose defaults you don't want, and opting out of browser-level tracking APIs, not plugging a gaping camera-access hole.",
    },
    {
      id: 'referrer-policy-unsafe-url',
      prompt:
        "A teammate sets `Referrer-Policy: unsafe-url` on a page whose URLs include query parameters like `?email=user@example.com&token=abc123`, reasoning it just means \"send a bit more referrer info than the safe default.\" What's actually exposed?",
      choices: [
        { id: 'a', text: 'Nothing new — unsafe-url only affects same-origin navigation, which is already visible.' },
        {
          id: 'b',
          text:
            "The full URL, including that query string, gets sent as the Referer header on every outgoing request from that page — to every third-party script, ad network, or analytics domain it talks to, and even on an HTTPS-to-HTTP downgrade — not just \"a bit more\" than the origin-only default.",
        },
        { id: 'c', text: 'Only the domain name is sent to third parties; paths and query strings are always stripped regardless of policy.' },
        { id: 'd', text: 'It only affects link clicks, not fetch() or image requests.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "unsafe-url is not a mild upgrade from the default — it's the least safe policy that exists, sending the complete URL everywhere, including on a downgrade to plain HTTP where a network observer can read it. Anything sensitive in a URL (tokens, emails, identifiers) leaks to every cross-origin request the page makes.",
    },
    {
      id: 'cert-lifetime-manual-renewal',
      prompt:
        'An ops team says short certificate lifetimes are "annoying" and plans to keep renewing by requesting the maximum allowed validity and doing it manually each cycle, even as CA/Browser Forum rules push maximum lifetimes down toward a much shorter window. What is the real risk in that plan?',
      choices: [
        { id: 'a', text: 'None — as long as someone remembers the renewal date, manual renewal scales fine at any cadence.' },
        {
          id: 'b',
          text:
            'A cadence that was manageable at 200+ days becomes a recurring, easy-to-miss chore at 100 days and effectively unworkable by hand as it approaches the 47-day range — a single missed renewal is a full site outage, and the fix is automation (ACME clients, cert-manager, a platform that handles it), not a better calendar reminder.',
        },
        { id: 'c', text: 'Shorter-lived certificates are cryptographically weaker, so the real risk is reduced security, not renewal logistics.' },
        { id: 'd', text: 'This only matters for internal/private certificates, not publicly-trusted ones.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "The shrinking-lifetime schedule exists precisely to force automation across the industry — a process that tolerates human error at an annual cadence does not tolerate it every 47 days. Teams still relying on manual renewal at that point are one missed calendar entry away from a full outage, which is the actual failure mode to plan around, not a security downgrade from the shorter cert itself.",
    },
  ],
};
