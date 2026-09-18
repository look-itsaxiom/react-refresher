import type { QuizStep } from '../../types';

export const quiz: QuizStep = {
  kind: 'quiz',
  id: 'quiz',
  title: 'Check your understanding',
  questions: [
    {
      id: 'q1',
      prompt:
        'A teammate writes a Server Function that reads a hidden `<input name="isAdmin" value="true">` to decide whether to allow a destructive action, reasoning that "the button is only rendered for admins anyway." What is wrong with this?',
      choices: [
        { id: 'a', text: 'Nothing -- if the UI only shows the button to admins, the check is redundant but harmless.' },
        {
          id: 'b',
          text: "A Server Function is a public endpoint, reachable by anyone who can construct the right request regardless of what the UI renders. A hidden field is a client-supplied claim, not proof of identity -- the check must read the caller's actual server-side session.",
        },
        { id: 'c', text: 'The problem is only that the field name should be `admin` instead of `isAdmin`.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "Once a function has 'use server' on it, hiding the UI that calls it does nothing to hide the endpoint itself -- it's reachable directly. Any authorization decision has to be made from something the server controls (a session, a signed cookie), never from a value the request itself supplied.",
    },
    {
      id: 'q2',
      prompt:
        "A Server Function defined inline inside a component closes over a variable from that component's scope, and the framework encrypts that closed-over value so it can reconstruct the bound function on the next call. What class of bug does this encryption exist to limit, and what does it NOT do?",
      choices: [
        {
          id: 'a',
          text: "It limits the 'poisoned closure' problem -- a secret accidentally captured by an inline Server Function leaking to the client -- by encrypting the value in transit and at rest in the bundle. It does NOT mean any value is safe to capture: encrypting a secret that shouldn't have left the server in the first place is a mitigation, not a fix for capturing it.",
        },
        { id: 'b', text: 'It prevents the Server Function from ever reading component state, full stop.' },
        { id: 'c', text: 'It makes it safe to capture any secret in a Server Function closure, since encryption fully protects it.' },
      ],
      correctChoiceId: 'a',
      explanation:
        "Closure encryption is defense in depth for a real design tension: an inline Server Function needs some way to carry bound arguments back and forth, and those arguments round-trip through the client. Encrypting them limits exposure, but the safer fix is to not capture secrets in the closure at all -- pass only what the function needs as an explicit, validated argument.",
    },
    {
      id: 'q3',
      prompt:
        'A todo list renders in two places on the same page: a sidebar summary and a full list. Both read the same underlying data through separate cached reads. After a mutation, the action returns the fresh list and updates the full list\'s local state. The sidebar still shows the old count. What is the most direct fix?',
      choices: [
        { id: 'a', text: 'Have the action also manually find and update the sidebar\'s state -- reach into it from the mutation.' },
        {
          id: 'b',
          text: "Tag both reads with the same cache tag (e.g. `'todos'`) and have the mutation call `revalidateTag('todos')` (or the equivalent invalidation for whatever cache is in use) so every reader of that tag, including the sidebar, re-fetches -- not just the one the mutation happened to return data to.",
        },
        { id: 'c', text: 'Poll both components on an interval so they eventually agree.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "Returning fresh data from a mutation only updates the one place that awaited that mutation. The moment a second, independent reader exists, you need a shared invalidation key so one write can mark every reader of that data stale -- that's exactly what revalidateTag/invalidateQueries-style APIs are for.",
    },
    {
      id: 'q4',
      prompt:
        "In Next.js 16's Cache Components model, when should you reach for `updateTag` instead of `revalidateTag` after a mutation?",
      choices: [
        {
          id: 'a',
          text: "When the mutating request's own next read needs to see the change immediately (read-your-own-writes) -- `updateTag` is callable only from a Server Function and updates the cached value right away, whereas `revalidateTag` marks it stale for a stale-while-revalidate refresh that may still serve the old value briefly.",
        },
        { id: 'b', text: 'They are interchangeable; `updateTag` is just an older name kept for backward compatibility.' },
        { id: 'c', text: '`updateTag` should be called from Client Components to bypass the server cache entirely.' },
      ],
      correctChoiceId: 'a',
      explanation:
        'revalidateTag and updateTag both key off the same tags but answer different urgency requirements: revalidateTag is the general-purpose "this is stale, refresh it soon" signal (with SWR behavior), while updateTag is specifically for the mutation\'s own follow-up read needing the new value with no window where stale data could still show.',
    },
    {
      id: 'q5',
      prompt:
        "React Router 8's actions automatically revalidate every loader on the current page once the action completes. A route's loader is expensive and the action almost never changes the data it depends on. What's the appropriate tool, and what's the risk of reaching for it too eagerly?",
      choices: [
        {
          id: 'a',
          text: "`shouldRevalidate` lets that route opt out of the automatic re-fetch when the action result indicates nothing relevant changed. The risk of using it too eagerly is staleness: if you guess wrong about what \"nothing relevant\" means, that loader's data silently falls out of sync with the mutation.",
        },
        { id: 'b', text: 'Switch the loader to `useEffect` so it only runs on mount, bypassing revalidation entirely.' },
        { id: 'c', text: 'There is no way to skip revalidation for one loader; it is all-or-nothing per page.' },
      ],
      correctChoiceId: 'a',
      explanation:
        "Automatic revalidation is the right default because it's easy to reason about (an action ran, so re-fetch everything visible), but it isn't free. shouldRevalidate is the escape hatch for a loader that's expensive and provably unaffected -- and like any cache-invalidation shortcut, it trades correctness risk for performance, so it should be justified by an actual cost, not applied preemptively.",
    },
    {
      id: 'q6',
      prompt:
        'A Server Function `updateProfile(formData)` validates its input, checks the session, and returns `{ ok: true, profile }` or `{ ok: false, errors }`. A teammate suggests testing it only by rendering the profile form and clicking through every combination of valid and invalid input in a browser-driven test. What is the better testing strategy, and why?',
      choices: [
        {
          id: 'a',
          text: "Call `updateProfile` directly with constructed `FormData` for each case and assert on the returned shape -- it's a plain async function once the directive is stripped away, so its validation and auth logic don't need a DOM to verify. Reserve rendered, clicked-through tests for what actually requires a DOM: loading states, focus management, accessibility of the error messages.",
        },
        { id: 'b', text: 'Browser-driven tests are strictly better for everything, since they exercise the real user path end to end.' },
        { id: 'c', text: 'Server Functions cannot be tested at all outside of a deployed environment.' },
      ],
      correctChoiceId: 'a',
      explanation:
        "The directive marks a boundary for the bundler, not a wall for your test tools -- the function underneath is callable directly. Testing its logic that way is faster and more precise than driving a form for every case; the form itself still deserves its own tests, but for the things only a DOM can show you.",
    },
  ],
};
