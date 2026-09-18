import type { QuizStep } from '../../types';

export const quiz: QuizStep = {
  kind: 'quiz',
  id: 'quiz',
  title: 'Check your understanding',
  questions: [
    {
      id: 'q1',
      prompt:
        'A page at `https://app.example.com` sends a `fetch` to `https://api.example.com` using the ambient session cookie, with no CORS headers on the response. What actually happens?',
      choices: [
        { id: 'a', text: 'The browser blocks the request from being sent at all, since the two are different origins.' },
        { id: 'b', text: 'The request is sent, cookie included, and reaches the server; the browser withholds the response body from the page\'s JavaScript because there is no Access-Control-Allow-Origin granting it.' },
        { id: 'c', text: 'The request is sent without the cookie, since cookies never cross origins.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'The same-origin policy gates reading a cross-origin response, not sending the request. The request goes out with the ambient cookie regardless; without a permissive CORS response header, the browser simply refuses to let the calling script read what came back. This send/read split is also the mechanism CSRF exploits.',
    },
    {
      id: 'q2',
      prompt:
        'A code review flags: "the delete button is only rendered for admins, so non-admins can\'t delete anything." Under the OWASP frontend mapping, what\'s missing?',
      choices: [
        { id: 'a', text: 'Nothing — hiding the control from non-admins in the UI is a sufficient access control.' },
        { id: 'b', text: 'The same authorization check has to run again on the server, inside whatever endpoint actually performs the delete — a client-side check is UX, not a security boundary, since anyone can call the endpoint directly.' },
        { id: 'c', text: 'The fix is to also disable (rather than hide) the button for non-admins.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'This is Broken Access Control (OWASP A01). Hiding or disabling a control changes what a compliant browser UI shows; it does nothing to stop a request built by hand, a replayed request, or a modified client bundle. The authorization decision has to be enforced where the action actually happens.',
    },
    {
      id: 'q3',
      prompt:
        'A team adds `<script src="https://cdn.example-widget.com/embed.js">` to load a third-party chat widget, with no Subresource Integrity attribute and no CSP restricting script sources. Six months later the vendor\'s CDN account is compromised. What is the actual exposure?',
      choices: [
        { id: 'a', text: 'None — the script only affects the widget\'s own iframe, isolated from the host page.' },
        { id: 'b', text: 'The injected script runs with the full privileges of the host page\'s origin — it can read the DOM, steal the session cookie if it is not HttpOnly, and act as the logged-in user, exactly like the polyfill.io incident.' },
        { id: 'c', text: 'The browser automatically detects the change in file contents and blocks the request.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'A same-origin <script> tag (not sandboxed in an iframe) executes with the full privileges of the embedding page, including DOM and storage access. A `<script src>` is a standing trust grant to whoever controls that URL at request time, which is exactly what changed hands in the 2024 polyfill.io incident. SRI (pinning to a content hash) and a script-src CSP are the mitigations.',
    },
    {
      id: 'q4',
      prompt:
        'A `package-lock.json`/`pnpm-lock.yaml` pins exact versions of every dependency. A teammate argues this fully protects against the 2025 npm supply-chain incidents (the compromised `chalk`/`debug` maintainer account, and the self-propagating Shai-Hulud worm). Is that right?',
      choices: [
        { id: 'a', text: 'Yes — a pinned lockfile can never resolve to a malicious version.' },
        { id: 'b', text: 'Only partially — a lockfile pins a version *number*, and if that version is already malicious by the time you first install it (or a lockfile update bumps to a since-compromised release), pinning by version alone doesn\'t stop it; hash-based integrity checks and vetted install-script behavior matter too.' },
        { id: 'c', text: 'No — lockfiles have no security purpose at all.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'A lockfile pins by version, and both incidents involved malicious code published under a version number that a lockfile update, or a fresh install before you\'d pinned it, could still pull in. Lockfile integrity hashes catch a swapped tarball under the same version; they don\'t catch a genuinely new malicious release your lockfile bumps to. This is why lesson 68 covers provenance and install-script quarantine as additional layers.',
    },
    {
      id: 'q5',
      prompt:
        'A feature adds a `postMessage` listener so an embedded third-party iframe can tell the host page to navigate: `window.addEventListener("message", (e) => { location.href = e.data.url; })`. Applying STRIDE to this entry point, what is the primary threat, and what closes it?',
      choices: [
        { id: 'a', text: 'Denial of Service — a flood of messages could crash the tab; the fix is to debounce the listener.' },
        { id: 'b', text: 'Spoofing — any page that can reach this window (not just the intended iframe) can post a message; the fix is to check `event.origin` against an allowlist before trusting `e.data` at all, in addition to validating the URL itself.' },
        { id: 'c', text: 'There is no real threat, since `postMessage` is same-origin by default.' },
      ],
      correctChoiceId: 'b',
      explanation:
        '`postMessage` has no origin restriction unless the sender specifies a target origin and the receiver checks `event.origin` — any window with a reference to yours can post to your listener, which is exactly the Spoofing entry in this lesson\'s threat catalog. Even after checking origin, treating `e.data.url` as a safe navigation target still needs its own validation (it is an open-redirect-shaped sink).',
    },
    {
      id: 'q6',
      prompt:
        'A PR adds a new feature with a new third-party analytics SDK and a new `postMessage` listener, but the reviewer approves it without any mention of security, since "nothing looks obviously broken." What does the "threat-model in the PR template" habit change about this review?',
      choices: [
        { id: 'a', text: 'Nothing meaningfully — a security team should review every PR after merge instead.' },
        { id: 'b', text: 'It forces an explicit, cheap check at the point where it is easiest to act: does this change introduce a new entry point, a new trust boundary, or a new third-party dependency? Here the answer is yes twice, which should prompt naming the assets, the entry points, and a control for each, before merge rather than after an incident.' },
        { id: 'c', text: 'It replaces the need for CSP, SRI, and other technical controls with a documentation requirement.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'Threat modeling as a continuous team practice (per the Threat Modeling Manifesto) means asking the four questions — assets, entry points, trust boundaries, third-party surface — at the moment a change is proposed, which is far cheaper than discovering the gap later. It does not replace technical controls like CSP or SRI; it is what prompts someone to add them in the first place.',
    },
  ],
};
