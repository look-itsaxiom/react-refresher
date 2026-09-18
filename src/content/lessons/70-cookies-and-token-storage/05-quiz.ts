import type { QuizStep } from '../../types';

export const quiz: QuizStep = {
  kind: 'quiz',
  id: 'quiz',
  title: 'Check your understanding',
  questions: [
    {
      id: 'q1',
      prompt:
        'A team names their session cookie `__Host-session` and sets `Secure`, `HttpOnly`, and `SameSite=Lax`, but also sets `Domain=example.com` so it works across a staging subdomain during testing. What happens?',
      choices: [
        { id: 'a', text: 'It works as intended — `__Host-` just means "prefer host-only," and setting Domain anyway is a harmless override.' },
        { id: 'b', text: 'A compliant browser refuses to accept the Set-Cookie at all, because `__Host-` requires no Domain attribute (as well as Secure and Path=/); the fix is a differently-named cookie for staging, not relaxing the prefix rule.' },
        { id: 'c', text: 'The browser accepts it but silently drops the Domain attribute, falling back to host-only scoping.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'The `__Host-` prefix is enforced by the browser at parse time: any Set-Cookie for a `__Host-`-prefixed name that includes a Domain attribute, omits Secure, or sets a Path other than `/` is rejected outright, not silently adjusted. Cross-subdomain sharing and the `__Host-` prefix are mutually exclusive by design — pick a different cookie for the case that needs Domain.',
    },
    {
      id: 'q2',
      prompt:
        'A cookie is set with `Path=/admin` and no other restriction. A script running on the same origin, on a completely different page path like `/blog`, calls `document.cookie`. Can it read that cookie\'s value?',
      choices: [
        { id: 'a', text: 'No — Path scopes document.cookie access the same way it scopes which requests carry the cookie.' },
        { id: 'b', text: 'Yes — Path only controls which outgoing requests the browser attaches the cookie to; document.cookie exposes every non-HttpOnly cookie for the origin regardless of the page\'s current path.' },
        { id: 'c', text: 'Only if the script itself is served from a URL under /admin.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'Path is request-routing hygiene, not an isolation boundary between features on one origin. Any script with same-origin execution can read any non-HttpOnly cookie belonging to that origin through document.cookie, no matter what Path the cookie was scoped to for outgoing requests.',
    },
    {
      id: 'q3',
      prompt:
        'A React SPA stores its access token in `sessionStorage` instead of `localStorage`, reasoning that "sessionStorage clears when the tab closes, so it\'s the safer choice." Against which of the two capabilities does that switch actually help?',
      choices: [
        { id: 'a', text: 'It helps against XSS — sessionStorage is not readable by injected scripts the way localStorage is.' },
        { id: 'b', text: 'It helps against a same-origin script reading the value at all after the tab closes, and against another already-open tab reading it live — but does nothing against XSS running in the same tab while it\'s open, since sessionStorage is exactly as script-readable as localStorage during that window.' },
        { id: 'c', text: 'It helps against CSRF, since sessionStorage values are never attached to outgoing requests automatically.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'sessionStorage and localStorage differ in persistence and cross-tab sharing, not in script-readability. An XSS payload executing in the tab where the token lives reads sessionStorage exactly as easily as localStorage; the switch narrows the *blast radius* (no cross-tab leak, nothing left after the tab closes) without removing the fundamental XSS exposure that in-memory storage would remove.',
    },
    {
      id: 'q4',
      prompt:
        'A team moves their access token from localStorage into a module-level JS variable, and their refresh token into an HttpOnly, Secure, `__Host-`-prefixed cookie with SameSite=Lax. A reviewer says "great, this is now immune to token theft." Is that accurate?',
      choices: [
        { id: 'a', text: 'Yes — HttpOnly and in-memory storage together close every realistic token-theft path.' },
        { id: 'b', text: 'No — an XSS payload still executing at the moment the in-memory access token is set can read it directly from the running page, and the refresh endpoint is now exposed to CSRF unless it has its own explicit defense beyond SameSite=Lax alone (e.g. an Origin check or a token) for the residual Lax+POST window.' },
        { id: 'c', text: 'No — SameSite=Lax cookies are sent on every cross-site request, so the refresh token is fully exposed to any third-party site.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'In-memory storage narrows persistence, not live readability — an XSS payload running in the page can still read a JS variable the instant it exists. And moving the refresh token into a cookie reopens the CSRF surface that localStorage never had, so SameSite alone (given the Lax+POST exception from lesson 66) is not a complete answer; it needs an explicit CSRF defense alongside it.',
    },
    {
      id: 'q5',
      prompt:
        'A Next.js app reads the session cookie inside a server component with `cookies()` from `next/headers` and forwards the resulting user object as a prop to a client component. Is any part of this exposing the token to the browser the way a client-side `fetch` with the token attached would?',
      choices: [
        { id: 'a', text: 'Yes — any value passed from a server component to a client component ends up in the client bundle, tokens included.' },
        { id: 'b', text: 'No, as long as the prop passed down is the derived user object (name, roles, etc.), not the raw token itself — the token stays in server-only code, and only its already-authenticated result crosses the server/client boundary.' },
        { id: 'c', text: 'No, because cookies() is only callable from the browser, so this code wouldn\'t run on the server at all.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'The BFF pattern applied to a server-rendered app means the token itself never needs to leave server-only code. Reading the cookie and forwarding a *derived* prop (a parsed user object) is fine; the mistake would be forwarding the token value itself as a prop, which does serialize into what the client receives.',
    },
    {
      id: 'q6',
      prompt:
        'A logged-in user has two tabs open. They click "log out" in tab A, which clears the in-memory access token and calls an endpoint that deletes the refresh cookie server-side. Tab B still shows them as logged in until its next API call fails. What closes that gap, and why doesn\'t simply relying on the deleted cookie do it immediately?',
      choices: [
        { id: 'a', text: 'Nothing needs to close it — tab B will naturally re-read the deleted cookie via document.cookie on its next render and notice it\'s gone.' },
        { id: 'b', text: 'Broadcasting the logout across tabs — via a storage event (written by tab A, observed by tab B) or a BroadcastChannel message — lets tab B react immediately; relying on the cookie alone doesn\'t help because tab B\'s in-memory access token is independent per tab and isn\'t re-validated until it makes another request.' },
        { id: 'c', text: 'Nothing can close that gap without a full page reload in every open tab, triggered manually by the user.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'Each tab holds its own independent in-memory token and its own JS execution context; deleting a cookie doesn\'t push a notification into a tab that isn\'t currently making a request. A storage event or BroadcastChannel message is how one tab tells the others "something changed" so they can proactively drop their own in-memory state instead of waiting to fail an API call first.',
    },
  ],
};
