import type { QuizStep } from '../../types';

export const quiz: QuizStep = {
  kind: 'quiz',
  id: 'sessions-vs-tokens-quiz',
  title: 'Quiz: Sessions vs tokens',
  questions: [
    {
      id: 'revoke-everywhere',
      prompt:
        "A security incident requires killing a specific user's access immediately, across every device they're logged into. The system uses self-contained JWT access tokens with a 15-minute expiry and no server-side check on the access token itself (only the refresh token is checked against a database on each use). What is the actual state of that user's access the moment you flag their account?",
      choices: [
        { id: 'a', text: 'Instantly revoked -- flagging the account invalidates every JWT that names that user.' },
        {
          id: 'b',
          text: "Every already-issued access token remains valid, and usable, until its own `exp` passes -- up to the full 15 minutes -- because nothing checks a signed, unexpired JWT against any server-side state. Only the next refresh attempt is blocked.",
        },
        { id: 'c', text: 'It depends on which browser tab the user has open.' },
        { id: 'd', text: 'JWTs are automatically revoked the moment the signing key is checked.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'This is the concrete cost of "stateless": a valid signature is sufcient on its own, so revocation can only act on the parts of the system that do a lookup. A short access-token lifetime bounds the damage window; it does not create instant revocation. If instant, guaranteed revocation is the actual requirement, the access check itself needs a server-side lookup -- which is a cookie session by another name.',
    },
    {
      id: 'sticky-vs-shared',
      prompt:
        'A cookie-session app currently uses sticky sessions (the load balancer pins a client to one server by source IP) and is about to move to autoscaling on a spot-instance pool, where instances can be reclaimed with only a few minutes notice. What is the concrete failure mode if nothing else changes?',
      choices: [
        { id: 'a', text: 'Nothing changes -- sticky sessions and autoscaling are unrelated concerns.' },
        {
          id: 'b',
          text: "Every session pinned to a reclaimed instance is logged out the moment that instance goes away, because the session data lived only on that instance -- autoscaling down becomes a mass, unplanned logout event.",
        },
        { id: 'c', text: 'The load balancer automatically migrates sessions to the new instance.' },
        { id: 'd', text: 'This only matters for bearer tokens, not cookie sessions.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'Sticky sessions trade a shared store for a coupling between "which server has your data" and "which server the load balancer happens to route you to." That coupling is fine on a stable fleet and actively dangerous on one that scales down or gets preempted -- the fix is a shared session store (Redis, a database), which decouples any request from any specific server at the cost of a network hop per session read.',
    },
    {
      id: 'idle-vs-absolute',
      prompt:
        'A banking app sets only an absolute session timeout of 8 hours and no idle timeout. A user logs in, leaves their laptop unlocked and unattended at a cafe at hour 1, and a stranger sits down at hour 1.5. What can that stranger do with the session, and why does adding an idle timeout change the answer?',
      choices: [
        { id: 'a', text: 'Nothing -- an 8-hour absolute timeout is already short enough to prevent this.' },
        {
          id: 'b',
          text: "The stranger has full, active access to the session for up to the remaining 6.5 hours, because absolute timeout only measures time since login, not time since the last real activity -- an idle timeout (e.g. 5 minutes for a banking app) would have expired the session long before the stranger sat down.",
        },
        { id: 'c', text: 'The session ends automatically as soon as the original user walks away, independent of any timeout setting.' },
        { id: 'd', text: 'Absolute and idle timeouts are two names for the same check.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "Idle and absolute timeouts answer different questions and both are needed: idle timeout bounds how long a session survives *inactivity* (protecting against exactly this walk-away scenario), and absolute timeout bounds how long a session survives regardless of activity (protecting against a session that's kept alive indefinitely by an attacker who automates activity). Neither substitutes for the other.",
    },
    {
      id: 'why-rotate-on-login',
      prompt:
        "A login flow authenticates the user but reuses the same pre-login session identifier the browser already had, rather than issuing a new one. What attack does this specifically enable, and why does simply updating the session's data (marking it 'authenticated: true') without changing the id fail to close it?",
      choices: [
        {
          id: 'a',
          text: "Session fixation: an attacker who got the victim's browser to adopt an attacker-chosen session id before login (e.g. via a URL parameter or a subdomain that can set cookies) now has a session id that becomes authenticated as the victim the moment the victim logs in -- because the id itself never changed, only its data did, and the attacker already knows that id.",
        },
        { id: 'b', text: 'It has no security effect; only the session data matters, not the identifier.' },
        { id: 'c', text: 'It only matters if the session id is shorter than 64 bits of entropy.' },
        { id: 'd', text: 'This enables CSRF but not session fixation.' },
      ],
      correctChoiceId: 'a',
      explanation:
        "Rotating the identifier on login (and on any privilege change) is what closes session fixation: an attacker-planted pre-login id becomes worthless because the id the victim ends up authenticated under is a brand-new one the attacker never saw. Marking the same id as 'authenticated' does not help, because the attacker's copy of that id is still valid and now also authenticated.",
    },
    {
      id: 'bff-xss-blast-radius',
      prompt:
        'A team adopts a BFF: the SPA never holds an access or refresh token, only an opaque, HttpOnly session cookie. A stored XSS bug is then found in the SPA. What does the BFF actually prevent here, and what does it not prevent?',
      choices: [
        {
          id: 'a',
          text: 'It prevents the XSS bug from existing in the first place.',
        },
        {
          id: 'b',
          text: "It prevents the attacker from exfiltrating a reusable, long-lived credential (there is no token in the page for the script to read) -- but the injected script can still drive the BFF's proxy as the logged-in user in real time, in that tab, for as long as the session is open. XSS is still a real incident; it's just not a stolen-token incident.",
        },
        { id: 'c', text: 'It prevents any request the script makes from reaching the real API at all.' },
        { id: 'd', text: 'It converts the XSS bug into a CSRF bug instead.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "The BFF narrows the blast radius of a token-theft attack (there's no token to steal), it does not eliminate what script injection can do. An attacker's script running in an authenticated page can still call whatever the BFF exposes, as the user, live -- that's still bad, just a different and generally smaller failure mode than 'attacker now has a bearer token usable from any machine, until it expires.'",
    },
    {
      id: 'fetch-metadata-on-bff',
      prompt:
        "A BFF's proxy endpoint sits behind an ordinary `SameSite=Lax` session cookie and adds no other check. Per lesson 66, what specific gap does `SameSite=Lax` alone leave open against this endpoint, and what does checking `Sec-Fetch-Site` add?",
      choices: [
        { id: 'a', text: 'SameSite=Lax already blocks every cross-site request to this endpoint; Sec-Fetch-Site is redundant.' },
        {
          id: 'b',
          text: "SameSite=Lax withholds the cookie on cross-site subresource requests (fetch, XHR, iframe loads) but still allows it on a cross-site top-level POST navigation within Chrome's roughly two-minute Lax+POST exception, and on any state-changing GET reachable via a plain link. Checking `Sec-Fetch-Site` and rejecting anything that isn't `same-origin`/`none` closes both gaps with one rule, independent of the cookie's own attribute.",
        },
        { id: 'c', text: 'Sec-Fetch-Site is only relevant for CORS preflight requests, not for cookie-authenticated ones.' },
        { id: 'd', text: 'Sec-Fetch-Site can be freely set by an attacker page, so it adds no real protection.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "SameSite=Lax narrows the CSRF surface a lot but not to zero, and a BFF's proxy is exactly the kind of state-changing, cookie-authenticated endpoint where the remaining gap matters. Sec-Fetch-Site is sent by the browser itself and can't be spoofed by a page's script or a plain HTML form, which is what makes it a reliable second check layered on top of, not instead of, SameSite.",
    },
  ],
};
