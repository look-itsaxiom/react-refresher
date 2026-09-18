import type { QuizStep } from '../../types';

export const quiz: QuizStep = {
  kind: 'quiz',
  id: 'quiz',
  title: 'Check your understanding',
  questions: [
    {
      id: 'q1',
      prompt:
        'A component nested three levels deep renders `<title>Order #42</title>`. What does React do with it?',
      choices: [
        { id: 'a', text: 'Nothing special — it renders a literal `<title>` element in place, like any other tag.' },
        { id: 'b', text: 'It hoists the tag into `document.head` during commit, wherever the head actually is.' },
        { id: 'c', text: 'It throws, because `<title>` may only be rendered at the root of the app.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'React 19 special-cases `<title>`, `<meta>`, and non-stylesheet `<link>` rendered anywhere in the tree: it moves them into `<head>` at commit time, no matter how deep the component that rendered them is.',
    },
    {
      id: 'q2',
      prompt:
        'Two sibling components each render `<meta name="description" content="...">` with different content. What ends up in the DOM?',
      choices: [
        { id: 'a', text: 'Both tags, in render order — you get two `<meta name="description">` elements.' },
        { id: 'b', text: 'A build-time error, since duplicate metadata is invalid HTML.' },
        { id: 'c', text: 'One tag: React dedupes by the tag\'s identity and keeps the one committed last.' },
      ],
      correctChoiceId: 'c',
      explanation:
        'React dedupes `<title>` and `<meta>` automatically. You do not need to coordinate across components to avoid duplicates; whichever one is committed last wins.',
    },
    {
      id: 'q3',
      prompt:
        'A component sets `document.title` in a `useEffect` with no cleanup function, then unmounts. What happens to the tab title?',
      choices: [
        { id: 'a', text: 'It reverts to whatever it was before the component mounted.' },
        { id: 'b', text: 'It stays as the last value the effect set — nothing reset it.' },
        { id: 'c', text: 'React automatically restores the previous title on unmount, regardless of how it was set.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'Manual `document.title` mutation has no lifecycle tied to the component; without an explicit cleanup, the value just sits there. Rendering `<title>` directly avoids this because React removes the tag it inserted when the component unmounts.',
    },
    {
      id: 'q4',
      prompt:
        'You render three `<link rel="stylesheet" href="..." precedence="components" />` tags from three different components that mount in an unpredictable order. Why use `precedence` instead of just letting them mount in whatever order they mount?',
      choices: [
        { id: 'a', text: '`precedence` is required syntax — a stylesheet `<link>` without it is invalid JSX.' },
        { id: 'b', text: 'It groups the sheets so their DOM order reflects the declared group, not component mount order, keeping the cascade predictable.' },
        { id: 'c', text: 'It makes the stylesheets load in parallel instead of sequentially.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'Without `precedence`, stylesheet order in the DOM (and therefore in the cascade) depends on component mount order, which is often not what you want. `precedence` lets you declare cascade groups independent of mount order.',
    },
    {
      id: 'q5',
      prompt:
        'You know a user is likely to open a settings modal soon, and want its CSS active immediately once they do, not merely cached. Which call fits?',
      choices: [
        { id: 'a', text: '`preload(href, { as: \'style\' })`' },
        { id: 'b', text: '`preinit(href, { as: \'style\' })`' },
        { id: 'c', text: '`prefetchDNS(href)`' },
      ],
      correctChoiceId: 'b',
      explanation:
        '`preload` only fetches a resource into cache for later use by rendered JSX. `preinit` fetches AND applies/executes immediately — the right choice when you want the stylesheet in effect now, called imperatively rather than rendered.',
    },
    {
      id: 'q6',
      prompt:
        'Your app talks to a third-party image CDN on a different origin. You are not fetching from it yet, but you know you will within the next second or two. Which hint is the better fit than `dns-prefetch` alone?',
      choices: [
        { id: 'a', text: '`preconnect(href)` — it also completes the TCP and TLS handshake, not just DNS.' },
        { id: 'b', text: '`preinitModule(href)` — it preloads the CDN as an ES module.' },
        { id: 'c', text: 'There is no difference; `dns-prefetch` and `preconnect` do the same work.' },
      ],
      correctChoiceId: 'a',
      explanation:
        '`prefetchDNS` only resolves the hostname. `preconnect` goes further and completes the connection setup (TCP + TLS) so the first real request to that origin skips that latency — worth the extra cost only when you are fairly sure you will use the connection soon.',
    },
  ],
};
