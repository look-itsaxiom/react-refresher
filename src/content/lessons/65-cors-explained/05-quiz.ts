import type { QuizStep } from '../../types';

export const quiz: QuizStep = {
  kind: 'quiz',
  id: 'quiz',
  title: 'Check your understanding',
  questions: [
    {
      id: 'q1',
      prompt:
        'A developer sees "blocked by CORS policy" in the console and says "the request must have failed to reach the server." A teammate tests the same endpoint with `curl` and it returns data fine, which the developer takes as proof curl is somehow bypassing the block. What is actually going on?',
      choices: [
        { id: 'a', text: 'The browser request never reached the server at all; curl succeeding proves the server is reachable by other means.' },
        { id: 'b', text: 'The browser request reached the server and got a full response back; the browser then withheld that response from the page\'s JavaScript because the response lacked a valid Access-Control-Allow-Origin. curl has no same-origin policy, so it was never subject to the same check.' },
        { id: 'c', text: 'curl is bypassing CORS by spoofing a trusted Origin header.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'A CORS block happens after the request completes on the wire; it is the browser refusing to expose a response it already received to the calling script. Non-browser clients like curl or Postman have no same-origin policy, so a request succeeding there says nothing about whether a browser page can read it.',
    },
    {
      id: 'q2',
      prompt:
        'A frontend team wants to fix a CORS error and proposes sending `Access-Control-Allow-Origin: https://app.example.com` as a header on their outgoing `fetch` request. Will that work?',
      choices: [
        { id: 'a', text: 'Yes, sending the header on the request tells the browser to trust the response regardless of what the server sends back.' },
        { id: 'b', text: 'No — Access-Control-Allow-* headers are response headers set by the server being called; a frontend cannot grant itself permission to read a response, and sending an unrecognized header on the request would itself force an otherwise-simple request into a preflight.' },
        { id: 'c', text: 'Yes, but only if the request also includes credentials: "include".' },
      ],
      correctChoiceId: 'b',
      explanation:
        'CORS is answered by whoever controls the target server\'s response, never by the calling page. If you don\'t control that server, the only fixes are getting the server\'s owner to add the right response headers, or routing the call through a same-origin proxy/BFF so the browser never sees it as cross-origin.',
    },
    {
      id: 'q3',
      prompt:
        'In the Network tab, the OPTIONS preflight for a PUT request shows status 200. The actual PUT is still blocked with a console error about the method not being allowed. What does the 200 on the preflight tell you, and what should you check next?',
      choices: [
        { id: 'a', text: 'The 200 status proves the preflight succeeded, so the block must be an unrelated bug in the browser.' },
        { id: 'b', text: 'A successful HTTP status on the OPTIONS response does not mean the preflight granted anything; some generic handler may have answered OPTIONS without setting any Access-Control-Allow-* headers. Open that specific response and check whether Access-Control-Allow-Methods is present and includes PUT.' },
        { id: 'c', text: 'PUT requests cannot be preflighted at all, so the error must be about something else entirely.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'The browser evaluates the preflight by its headers, not its status code. A 200 or 204 from a catch-all router that never sets Access-Control-Allow-Methods still fails the browser\'s check silently from the developer\'s point of view — the fix is always to inspect the actual response headers on that OPTIONS request.',
    },
    {
      id: 'q4',
      prompt:
        'An API needs to support cookie-based sessions from several known frontend domains. A developer configures `Access-Control-Allow-Origin: *` and `Access-Control-Allow-Credentials: true` together, reasoning that the wildcard is simplest and credentials just adds cookies on top. What happens?',
      choices: [
        { id: 'a', text: 'It works — the wildcard allows any origin, and the credentials header adds cookie support on top of that.' },
        { id: 'b', text: 'The Fetch standard forbids the combination outright: a credentialed request must receive a specific, non-wildcard origin in Access-Control-Allow-Origin, so the browser rejects the response regardless of what Access-Control-Allow-Credentials says. The server needs to echo back one allowlisted origin per request instead.' },
        { id: 'c', text: 'It works only in Chrome, since Firefox enforces the wildcard/credentials restriction more strictly.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'This is a spec rule enforced identically by every browser, not a vendor difference: a wildcard Access-Control-Allow-Origin is invalid the moment credentials are involved, precisely because it would let any site on the internet read authenticated responses as the logged-in user. The fix is to check the incoming Origin against an allowlist and echo back the matching one.',
    },
    {
      id: 'q5',
      prompt:
        'A developer, frustrated by a persistent CORS error on a third-party API call, switches to `fetch(url, { mode: "no-cors" })` and the console error disappears. They conclude the problem is fixed. What is the actual state of the code now?',
      choices: [
        { id: 'a', text: 'Fixed — no-cors mode successfully bypasses the CORS restriction and the data is now available to the page.' },
        { id: 'b', text: 'Not fixed — no-cors mode still sends the request, but the response is opaque: status is always reported as 0 and the body is unreadable by JavaScript no matter what the server sends. The error disappeared because the code stopped asking a question it would be refused an answer to, not because it got the data.' },
        { id: 'c', text: 'Fixed for GET requests only; POST would still fail under no-cors mode.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'no-cors is a way of saying "I don\'t need to read the response," useful for genuine fire-and-forget cases. It never provides a readable body, status, or headers, so silencing the error this way just hides a bug rather than fixing one — anything relying on `response.json()` or checking `response.status` after this call is now broken silently.',
    },
    {
      id: 'q6',
      prompt:
        'A security review flags that an endpoint has no CORS configuration at all (no Access-Control-Allow-Origin ever), yet the same endpoint is vulnerable to CSRF: a malicious site\'s hidden auto-submitting form can trigger a state-changing action using the victim\'s session cookie. A junior engineer argues "that can\'t be right, CORS should have stopped that." What is the correct reasoning?',
      choices: [
        { id: 'a', text: 'The junior engineer is right — the lack of CORS headers should have blocked the request entirely, so this must be a browser bug.' },
        { id: 'b', text: 'CORS and CSRF defend against different things: CORS controls whether the calling script can read a cross-origin response, not whether a cross-origin request can be sent with ambient cookies in the first place. A plain HTML form POST needs to read nothing to cause a side effect, so no CORS check ever applies to it — SameSite cookies or a CSRF token are what stop this, not CORS.' },
        { id: 'c', text: 'CORS only applies to fetch()/XHR requests initiated from JavaScript, so adding a CORS header to the endpoint would fix the CSRF vulnerability.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'The same-origin policy gates reading, not sending, and a form submission is a "send" with no read step at all. Believing CORS is a CSRF defense is one of the most consequential misreads in this space, because it leads teams to skip the actual defenses — SameSite=Lax/Strict cookies and CSRF tokens — thinking CORS already covers it.',
    },
  ],
};
