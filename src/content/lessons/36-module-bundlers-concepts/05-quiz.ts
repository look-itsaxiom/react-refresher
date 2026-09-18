import type { QuizStep } from '../../types';

export const quiz: QuizStep = {
  kind: 'quiz',
  id: 'quiz',
  title: 'Check your understanding',
  questions: [
    {
      id: 'q1',
      prompt:
        'A dependency is published as CommonJS with `module.exports = { formatDate, parseDate, ... }` and no `sideEffects` field. After bundling, the production chunk still includes the full module even though only `formatDate` is imported. Why?',
      choices: [
        { id: 'a', text: 'The bundler has a bug; ESM and CJS should tree-shake identically.' },
        {
          id: 'b',
          text: "CJS exports are an opaque runtime object assigned inside the module body, not a statically-analyzable list of bindings, so the bundler can't prove which properties are unused without running the module — it has to assume the whole thing might be needed.",
        },
        { id: 'c', text: 'Tree shaking only works on the entry file, never on dependencies.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "Tree shaking depends on static analysis of ESM's named bindings, which exist before any code runs. CommonJS's `module.exports` assignment is just a runtime object mutation — there's no static list to diff imports against, so per-export dropping isn't possible without a sideEffects promise or a purpose-built CJS-to-ESM interop analysis.",
    },
    {
      id: 'q2',
      prompt:
        'A component file exports both a default React component and a plain constant (`export const MAX_ITEMS = 10`). Editing the component during development causes the whole page to lose state on every hot-reloaded edit, even edits inside the component body. Why?',
      choices: [
        { id: 'a', text: 'HMR is broken for any file with more than one export.' },
        {
          id: 'b',
          text: "React Fast Refresh only takes the state-preserving path for a module boundary whose exports are entirely React components; a non-component export like a constant makes the whole module ineligible, so it falls back to a full remount.",
        },
        { id: 'c', text: 'Constants can never be hot-reloaded, but the fix is a full page reload every time regardless.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "Fast Refresh's eligibility check is per-module, not per-export: any export that isn't a component disqualifies the whole file from the fast path. Splitting the constant into its own module (or a hooks/constants file, per the usual convention) restores state-preserving updates for the component.",
    },
    {
      id: 'q3',
      prompt:
        "A team notices Vite's dev server starts almost instantly on a small app, but a coworker's webpack-based project takes several seconds before the first page paints, even on a similarly sized codebase. What's the structural reason, not just \"webpack is slower\"?",
      choices: [
        {
          id: 'a',
          text: 'Vite serves source files as native, unbundled ESM and resolves imports as the browser requests them, so startup cost scales with what the current page needs; a bundled dev server builds a bundle up front, so startup cost scales with the whole app.',
        },
        { id: 'b', text: 'Vite skips TypeScript type-checking entirely, which is the only real difference.' },
        { id: 'c', text: 'webpack always minifies its dev builds, which Vite never does.' },
      ],
      correctChoiceId: 'a',
      explanation:
        "The type-checking point is true but secondary — both tools can defer type-checking to a separate process. The structural difference is bundled-vs-unbundled dev serving: a bundler-based dev server pays a cost proportional to the whole graph before first paint, while Vite's native-ESM model pays a cost roughly proportional to one page's dependencies.",
    },
    {
      id: 'q4',
      prompt:
        'Two lazy-loaded routes each dynamically import a large charting library. After a production build, the network panel shows the charting library downloaded once, cached, on the second route visit — but its code still visibly re-parses and re-executes a `console.log` inside it on that second visit. Is this a bundler bug?',
      choices: [
        {
          id: 'a',
          text: "Yes — if it's a shared chunk, it should only ever execute once for the whole session.",
        },
        {
          id: 'b',
          text: "No — code splitting controls what gets fetched (and browser HTTP caching prevents re-downloading), but each route's dynamic import() still creates its own module evaluation; a module-level side effect like a bare console.log runs again each time that chunk is imported, unless the app's own module-instance caching (or the router keeping the component mounted) prevents a second import() call.",
        },
        { id: 'c', text: 'Yes — shared chunks are only ever fetched, never executed, until a component actually renders.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "Splitting and caching are about *fetching* bytes, not about *how many times a module executes*. Whether a shared chunk's module-level code runs once or repeatedly depends on how many times something in the app actually calls import() (or a static import resolves) against it during that session — the bundler doesn't dedupe execution across separate dynamic import() calls the way ESM's module cache dedupes evaluation within one static graph.",
    },
    {
      id: 'q5',
      prompt:
        'A production error-tracking dashboard shows a stack trace pointing at `chunk-a1b2c3.js:1:48291` instead of the original component and line. The team confirms `sourceMappingURL` comments are present in the build output. What is most likely missing?',
      choices: [
        { id: 'a', text: 'The build needs `sourceMappingURL` comments, which apparently are already there, so nothing else could be wrong.' },
        {
          id: 'b',
          text: 'The generated `.map` files need to actually be uploaded to (or otherwise reachable by) the error-tracking service, and it needs to be told which release/build they correspond to — the comment pointing at a map is useless if the map itself was never published anywhere the tool can fetch it.',
        },
        { id: 'c', text: 'Source maps only work in local development, never in a deployed production build.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "A `sourceMappingURL` comment just names where a map would be; it doesn't guarantee the map was published or that the tracking service has it associated with the right release. Production setups deliberately don't serve maps publicly (to avoid exposing source) and instead push them straight to the error tracker, keyed by a release identifier — that upload/association step is the usual missing piece.",
    },
    {
      id: 'q6',
      prompt:
        'A `manualChunks` config pins `react` and `react-dom` into a chunk named `vendor-react`. After the next deploy — which only changed application code, not any dependency versions — the `vendor-react` chunk\'s filename hash is unchanged, but the app chunk\'s hash changes. What is this arrangement optimizing for?',
      choices: [
        { id: 'a', text: 'Nothing meaningful — chunk names and hashes are cosmetic.' },
        {
          id: 'b',
          text: "Cache stability for code that changes rarely: a returning visitor's browser keeps the cached vendor-react chunk (same hashed filename, same bytes) across a deploy that only touched app code, downloading just the smaller, newly-hashed app chunk instead of re-fetching React on every release.",
        },
        { id: 'c', text: 'Reducing the total number of HTTP requests to exactly one, regardless of route.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "Content hashing ties a chunk's filename to its bytes; a chunk that doesn't change keeps its filename and stays valid in the browser's cache indefinitely. Manually pinning slow-changing dependencies into their own chunk maximizes how often that chunk's hash — and therefore its cache entry — survives a deploy, versus letting app code and vendor code get bundled (and re-hashed) together on every change.",
    },
  ],
};
