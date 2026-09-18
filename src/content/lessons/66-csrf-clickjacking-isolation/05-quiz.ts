import type { QuizStep } from '../../types';

export const quiz: QuizStep = {
  kind: 'quiz',
  id: 'quiz',
  title: 'Check your understanding',
  questions: [
    {
      id: 'q1',
      prompt:
        'A session cookie is set with no explicit `SameSite` attribute. A user on `evil.example` is shown a plain HTML `<form method="POST" action="https://bank.example/transfer">` that auto-submits via JavaScript calling `form.submit()`. The cookie was set 90 seconds ago. Does the cookie ride along?',
      choices: [
        { id: 'a', text: 'No — a missing SameSite attribute is treated as Strict, so it never crosses sites.' },
        { id: 'b', text: 'Yes, potentially — a missing attribute defaults to Lax, and Chrome\'s temporary Lax+POST mitigation still attaches a cookie set within the last ~2 minutes to a cross-site top-level POST navigation like this form submit.' },
        { id: 'c', text: 'No — form.submit() is a subresource request, not a top-level navigation, so Lax withholds it regardless of age.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'No explicit SameSite defaults to Lax, not Strict. A form submission (even triggered by script) is a top-level navigation, and Lax normally blocks cross-site POST — except for Chrome\'s intentionally temporary Lax+POST exception, which still sends a cookie set within roughly the last two minutes. This is exactly the surviving slice CSRF defenses in depth (Origin checks, tokens) still need to cover.',
    },
    {
      id: 'q2',
      prompt:
        'An endpoint authenticates purely via `Authorization: Bearer <token>`, with the token held in memory and attached manually to every fetch call — no cookie is involved. A security reviewer says "this endpoint is not vulnerable to CSRF." Is that reviewer\'s reasoning sound, and what should the follow-up question be?',
      choices: [
        { id: 'a', text: 'The reasoning is sound and there\'s no follow-up needed — bearer-token auth has no meaningful attack surface here.' },
        { id: 'b', text: 'The reasoning about CSRF specifically is correct — no ambient credential means a forged cross-site request can\'t attach the header — but the follow-up has to be "what stops an XSS payload from reading and exfiltrating this token," since that is now the single point of failure.' },
        { id: 'c', text: 'The reasoning is wrong — any authenticated endpoint is vulnerable to CSRF regardless of how the credential is attached.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'A forged cross-site request has no way to attach a header the browser doesn\'t send automatically, so the CSRF claim holds. But that doesn\'t mean the endpoint is safe — it means the risk moved entirely onto script-injection defenses, since any XSS in the page can read and send the token exactly as the legitimate code does.',
    },
    {
      id: 'q3',
      prompt:
        'A response sets both `X-Frame-Options: DENY` and `Content-Security-Policy: frame-ancestors https://partner.example`. A page on `https://partner.example` tries to embed it in an iframe. What happens in a current browser?',
      choices: [
        { id: 'a', text: 'The iframe is blocked — X-Frame-Options: DENY always wins when the two headers disagree.' },
        { id: 'b', text: 'The iframe loads successfully — when both headers are present, browsers honor the CSP frame-ancestors directive and ignore X-Frame-Options.' },
        { id: 'c', text: 'The browser throws a configuration error and refuses to render the page at all.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'frame-ancestors is the modern replacement for X-Frame-Options specifically because it supports a list of allowed origins, not just DENY/SAMEORIGIN. When both are set, browsers apply frame-ancestors and disregard X-Frame-Options — so here, partner.example is explicitly allowed and the frame loads.',
    },
    {
      id: 'q4',
      prompt:
        'A page sets `Cross-Origin-Opener-Policy: same-origin-allow-popups` and `Cross-Origin-Embedder-Policy: require-corp`, hoping to use `SharedArrayBuffer` for a WASM-based image editor while still opening a same-origin OAuth-style popup. Does `self.crossOriginIsolated` become `true`?',
      choices: [
        { id: 'a', text: 'Yes — require-corp is the header that matters for SharedArrayBuffer, and any COOP value stronger than unsafe-none satisfies the pairing.' },
        { id: 'b', text: 'No — cross-origin isolation specifically requires COOP: same-origin (the strict value), not same-origin-allow-popups; the weaker value still permits some live cross-origin window relationships, so SharedArrayBuffer stays unavailable.' },
        { id: 'c', text: 'Yes, but only inside the popup window, not the opener.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'same-origin-allow-popups exists precisely so a page can open popups (like OAuth flows) without giving up all isolation, but that flexibility is exactly what disqualifies it from the strict crossOriginIsolated capability. Getting SharedArrayBuffer back requires the plain same-origin value, which usually means moving the popup-opening flow to a route that doesn\'t need isolation, or handling the OAuth redirect without a popup.',
    },
    {
      id: 'q5',
      prompt:
        'A React app adds a `message` event listener to receive data from a payment iframe it embeds: `window.addEventListener("message", (e) => setAmount(e.data.amount))`. There is no `event.origin` check. What is the concrete exploit path, and does restricting the iframe\'s `src` to the payment provider\'s domain fix it?',
      choices: [
        { id: 'a', text: 'There is no exploit path — postMessage listeners can only receive messages from windows the page itself created or embedded.' },
        { id: 'b', text: 'Any window holding a reference to this one — a completely unrelated malicious tab opened via window.open, not just the embedded iframe — can call postMessage on it and have e.data.amount trusted; restricting the iframe\'s src does nothing, because the vulnerability is in the receiver not checking who sent the message, not in what the app itself chose to embed.' },
        { id: 'c', text: 'The exploit only works if the malicious page is embedded inside the same iframe, so restricting the iframe src does fix it.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'postMessage has no built-in origin restriction on the receiving end. Restricting which URL you load into your own iframe controls what you send messages to, not who is allowed to send messages to you — any window with a JS reference to this one can post to it. The fix has to be on the receiving side: check event.origin against an explicit allowlist before trusting event.data at all.',
    },
    {
      id: 'q6',
      prompt:
        'A team ships `<a href="https://partner.example" target="_blank">` without a `rel` attribute, reasoning "modern browsers already default target=_blank to noopener, so this is fine." Later, someone changes the link to open via `window.open("https://partner.example", "_blank")` in a click handler instead, for analytics reasons. Does the same safety hold?',
      choices: [
        { id: 'a', text: 'Yes — target=_blank always implies noopener regardless of how the navigation is triggered, whether by an <a> tag or by script.' },
        { id: 'b', text: 'No — the implicit noopener default applies to <a target="_blank"> as HTML markup; a scripted window.open() call does not get that default and still needs an explicit "noopener" in its features string to sever window.opener.' },
        { id: 'c', text: 'No — window.open() never allows window.opener regardless of any flags, making the explicit flag redundant either way.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'The implicit-noopener default (Chrome 88+, Firefox 79+) is specific to the <a target="_blank"> markup pattern. Switching to a scripted window.open() call silently reintroduces the tab-nabbing risk unless the code explicitly passes "noopener" (or "noopener,noreferrer") in the window features string — a good example of a safe default not surviving a refactor that looks equivalent.',
    },
  ],
};
