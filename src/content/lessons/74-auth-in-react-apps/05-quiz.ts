import type { QuizStep } from '../../types';

export const quiz: QuizStep = {
  kind: 'quiz',
  id: 'quiz',
  title: 'Check your understanding',
  questions: [
    {
      id: 'q1',
      prompt:
        'A team ships a `<RequireAuth>` wrapper around every protected route and, satisfied that anonymous users now get redirected to `/login`, removes the auth check their API previously did on every request, reasoning "the UI already handles this." What is wrong with that reasoning?',
      choices: [
        { id: 'a', text: 'Nothing — if every path to the protected UI goes through the wrapper, removing the redundant server check is a reasonable simplification.' },
        { id: 'b', text: 'A client-side guard is UX, not security: it only controls what a specific React tree renders in a specific browser. Any direct request to the API — curl, another client, a replayed request — bypasses the wrapper entirely, so the server must still enforce authorization on every request.' },
        { id: 'c', text: 'It\'s wrong only for public APIs; an API called exclusively from this one app can safely trust the client-side guard.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'A route guard decides what a component tree renders; it has no ability to stop a request that never runs that component tree in the first place. Nothing about "only this app calls the API" is true either — anyone can send an HTTP request to a public endpoint regardless of what UI they used to discover it.',
    },
    {
      id: 'q2',
      prompt:
        'A Next.js app relies entirely on its `proxy.ts` (the file formerly named `middleware.ts`) to redirect anonymous visitors away from `/dashboard`, with no additional session check in the layout or the Server Functions `/dashboard` calls. What does CVE-2025-29927 say about that design?',
      choices: [
        { id: 'a', text: 'It\'s fine, since middleware runs before every request reaches a page or a Server Function, so a single check there is architecturally equivalent to checking at each layer.' },
        { id: 'b', text: 'A crafted request could skip the middleware\'s authorization decision and reach the page anyway, so a design with no check beyond middleware had no remaining layer to catch that request; the fix is to also verify the session in the layout and in each Server Function, not to trust one edge layer exclusively.' },
        { id: 'c', text: 'The CVE only affected `getServerSideProps` apps, so an app using Server Functions was never exposed regardless of how it checked auth.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'The 2025 disclosure showed that a single edge-layer check is one bug away from being skippable outright, not just slow or redundant. Defense in depth — re-verifying in the layout and again in each Server Function, since a Server Function can be invoked directly — means a bypass at one layer doesn\'t expose the data.',
    },
    {
      id: 'q3',
      prompt:
        'You\'re modeling client auth state and choose an AuthStatus type of just "authenticated" or "anonymous" (a boolean, effectively) instead of adding an "unknown" state. What breaks first?',
      choices: [
        { id: 'a', text: 'Nothing breaks — you can always default to \'anonymous\' until the real session check resolves, since that\'s the safer assumption.' },
        { id: 'b', text: 'A hard refresh flashes the logged-out UI (or a redirect to /login) for every user, including already-authenticated ones, until the async session check resolves and flips the state — because there\'s no third state to represent "haven\'t checked yet."' },
        { id: 'c', text: 'Nothing breaks in the browser, but server-side rendering becomes impossible without the third state.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'Defaulting to \'anonymous\' is exactly the flash this causes: an authenticated user sees the logged-out state, or gets redirected, for the beat before the session check resolves. The `unknown` state exists specifically so a loading gate (or an SSR-provided initial session) can suppress that flash instead of guessing wrong for every visitor on every load.',
    },
    {
      id: 'q4',
      prompt:
        'Comparing Clerk to Better Auth for a new project with no existing user base: what is the most accurate way to frame the trade-off?',
      choices: [
        { id: 'a', text: 'Clerk is strictly more secure since it\'s a dedicated vendor; Better Auth is a security downgrade because you host it yourself.' },
        { id: 'b', text: 'Clerk trades speed-to-ship and hosted UI/org features for a recurring per-user cost and lock-in to its session format and stored user data; Better Auth trades that convenience for self-hosting, TypeScript-first configuration, and owning your own data and session format outright.' },
        { id: 'c', text: 'There\'s no real trade-off — both are free, self-hosted, open-source libraries with the same feature set under different names.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'Neither library is inherently more or less secure by virtue of being hosted or self-hosted; the actual trade is speed and maintenance burden against cost and control. Clerk is a paid hosted service (with lock-in on migration); Better Auth is a self-hosted, open library you configure and operate yourself.',
    },
    {
      id: 'q5',
      prompt:
        'A `useSyncExternalStore`-backed auth store\'s `getSnapshot()` builds and returns a brand-new `{ status, session }` object literal on every call, even when nothing has changed since the last call. What goes wrong?',
      choices: [
        { id: 'a', text: 'Nothing — React always re-renders on every call to getSnapshot anyway, so a fresh object each time is harmless.' },
        { id: 'b', text: 'React compares the snapshot to the previous one by reference to decide whether to re-render (and to detect tearing); a new object every call is never equal to the last one, causing an infinite re-render loop or a "getSnapshot should be cached" warning.' },
        { id: 'c', text: 'It only matters in React\'s concurrent renderer, not in the default synchronous one, so this is safe in most apps today.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'The `useSyncExternalStore` contract requires `getSnapshot` to return the same reference when nothing has changed. Building a new object on every call defeats that check — React sees a "change" every time it re-checks and either loops or warns, regardless of which renderer is in use.',
    },
    {
      id: 'q6',
      prompt:
        'A centralized fetch wrapper handles a 401 by refreshing once and retrying, and a 403 the same way — refresh, then retry. A teammate says the 403 branch is a bug. Are they right?',
      choices: [
        { id: 'a', text: 'No — both status codes mean "the request wasn\'t authorized," so the same refresh-and-retry policy is correct for either.' },
        { id: 'b', text: 'Yes — a 401 means the credential itself is invalid or expired, which a refresh can fix; a 403 means the credential is valid but the request is not permitted, which a refreshed token doesn\'t change, so retrying after a refresh just repeats the same forbidden request.' },
        { id: 'c', text: 'Yes, but only because 403 should trigger an immediate logout instead of any retry at all, regardless of what caused it.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'A refresh replaces an invalid or expired token with a valid one — it fixes exactly what a 401 signals. A 403 means the (valid) identity lacks permission for that specific action; no amount of refreshing changes what the user is allowed to do, so retrying after a refresh wastes a round trip and can mask the real problem from the user.',
    },
  ],
};
