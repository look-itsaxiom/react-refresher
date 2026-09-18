import type { QuizStep } from '../../types';

export const quiz: QuizStep = {
  kind: 'quiz',
  id: 'quiz',
  title: 'Check your understanding',
  questions: [
    {
      id: 'q1',
      prompt:
        'A team ships a risky change behind a feature flag on Friday, deployed to production but with the flag off. Monday morning, an on-call engineer wants to enable it for 10% of users, but the person who normally flips flags is out. What does "deploy vs. release" being separate actually buy them here?',
      choices: [
        { id: 'a', text: 'Nothing extra — they still need to redeploy to turn the flag on, so the separation is mostly bookkeeping.' },
        {
          id: 'b',
          text: 'The code is already live and inert; releasing to 10% is a config change (flipping the flag/rollout), not a new deploy, so anyone with flag access can do it without redeploying or waiting on the person who normally ships.',
        },
        { id: 'c', text: "It means the Friday deploy didn't need code review, since the flag being off makes the change safe by default." },
      ],
      correctChoiceId: 'b',
      explanation:
        'The whole point of separating deploy from release is that shipping code and exposing it to users become independent operations. Once the artifact is live, turning behavior on for a slice of users is a config change — fast, reversible, and not gated on whoever normally does deploys.',
    },
    {
      id: 'q2',
      prompt:
        'A percentage rollout buckets users by hashing `flagKey + salt + userId`. A teammate proposes hashing just `userId` (dropping `flagKey` and `salt`) to save a bit of string concatenation. What breaks?',
      choices: [
        { id: 'a', text: 'Nothing — the hash is still deterministic per user, which is all a rollout needs.' },
        {
          id: 'b',
          text: "Every flag would put the exact same users in the same relative bucket position, so a user in the first 10% of one rollout is guaranteed to be in the first 10% of every other rollout too — rollouts stop being independent, and you can't re-shuffle a single rollout without affecting all of them.",
        },
        { id: 'c', text: 'The hash would no longer be deterministic, since userId alone is not random enough input for FNV-1a.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "Mixing the flag key (and a salt) into the hash input is what makes each flag's bucket assignment independent of every other flag's, and lets you reshuffle one rollout (by changing its salt) without touching any other flag's users.",
    },
    {
      id: 'q3',
      prompt:
        'Production error rate spikes 20 minutes after a deploy. The change that shipped touches a checkout flow and is not behind a feature flag; it also included a database migration that dropped a column the previous release\'s code still reads. What is the safest first move?',
      choices: [
        {
          id: 'a',
          text: 'Immediately roll back the deploy to the previous artifact, since that undoes a code regression the fastest.',
        },
        {
          id: 'b',
          text: "Check whether the column drop makes the previous release's code crash before rolling back — if it does, rolling back the deploy while the migration stays applied could make things worse, not better, and the safer move is to fix forward or restore the column first.",
        },
        { id: 'c', text: 'Nothing to check — instant rollback via the hosting platform always safely undoes both code and database changes together.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "This is exactly the expand/contract discipline's warning: a rollback only helps if the previous code can tolerate the current schema. A contract migration (dropping a column) that already ran makes a naive code rollback dangerous — the real fix here is checking that compatibility before reaching for the rollback button.",
    },
    {
      id: 'q4',
      prompt:
        "A React 19 app wraps its whole tree in one top-level ErrorBoundary and calls that \"error monitoring.\" What does relying on componentDidCatch alone actually miss, compared to also wiring up the root's onCaughtError/onUncaughtError/onRecoverableError options?",
      choices: [
        {
          id: 'a',
          text: 'Nothing — componentDidCatch fires for every error React encounters, including hydration mismatches, so the root options are redundant.',
        },
        {
          id: 'b',
          text: "onRecoverableError catches cases where nothing crashed and no boundary caught anything — like a hydration mismatch React silently patched over — so relying only on a boundary's componentDidCatch means those recovered-from failures generate no error report at all.",
        },
        { id: 'c', text: 'componentDidCatch cannot run in React 19 without also passing onCaughtError to createRoot, so the boundary would silently no-op.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "onRecoverableError is the one root option with no boundary equivalent: it fires when React recovers from a problem (like a hydration mismatch) without the user seeing an error and without any boundary catching anything. Skipping it means a real class of bugs generates zero signal.",
    },
    {
      id: 'q5',
      prompt:
        "A team's Sentry error volume drops 40% the week after a release and they conclude the release fixed a lot of bugs. What's the more likely explanation worth ruling out first?",
      choices: [
        { id: 'a', text: 'Sentry silently caps free-tier event volume, so a drop like this is almost always a billing/quota issue, never a real signal.' },
        {
          id: 'b',
          text: "Errors are being sent directly to *.sentry.io and an ad blocker or privacy extension is blocking that domain for a meaningful share of users, which suppresses reports regardless of whether the release changed anything — tunneling error requests through the app's own domain is the fix, not evidence the fix already happened.",
        },
        { id: 'c', text: 'The release bumped the version string, and Sentry only reports errors for the single most recent release by default, hiding the rest.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "Ad-blocker interference with the vendor's default ingest domain is a common, non-obvious cause of a sudden reporting drop that has nothing to do with code quality. Tunneling through your own domain removes that confound so volume changes actually reflect the app's behavior.",
    },
    {
      id: 'q6',
      prompt:
        "A monitoring client's beforeSend hook is given an event and told to scrub PII before it leaves the browser. A teammate scrubs only top-level keys named email, password, and token. What's the gap, and why does it matter for a real app?",
      choices: [
        { id: 'a', text: 'There is no gap — PII only ever appears at the top level of an error event\'s extra data in practice.' },
        {
          id: 'b',
          text: 'Context objects are often nested (a user object inside a request object inside extra), so a shallow scrub misses PII at any deeper level; scrubbing has to walk the object recursively, and should also catch PII-shaped values (like an email address) that show up under an unexpected key name, not just specific key names.',
        },
        { id: 'c', text: 'The gap is only that the key names are case-sensitive; fixing the casing solves the whole problem.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'Real context payloads nest data however the call site built them, so a scrubber keyed to exact top-level names will miss most of it. Effective scrubbing recurses through the whole object and also pattern-matches the content (an email regex, a bearer-token pattern) so PII in an unexpectedly-named field still gets caught.',
    },
  ],
};
