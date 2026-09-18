import type { QuizStep } from '../../types';

export const quiz: QuizStep = {
  kind: 'quiz',
  id: 'quiz',
  title: 'Check your understanding',
  questions: [
    {
      id: 'q1',
      prompt:
        'A team says "we moved to Rolldown, so our old Vite plugins should keep working." Why is that a reasonable expectation rather than wishful thinking?',
      choices: [
        { id: 'a', text: 'Rolldown ships a JavaScript compatibility shim that intercepts calls to Rollup and rewrites them at runtime.' },
        {
          id: 'b',
          text: "Rolldown implements the same plugin hooks (resolveId, load, transform, generateBundle, ...) that Rollup and Vite plugins already targeted, so most existing plugins run against it with little or no change.",
        },
        { id: 'c', text: 'Vite automatically transpiles any Rollup plugin to a Turbopack-compatible format on install.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "Rolldown was deliberately built Rollup-compatible at the plugin API level, not just fast. That's the whole reason the migration from esbuild+Rollup to a single Rolldown bundler in Vite 8 could happen without breaking the existing plugin ecosystem.",
    },
    {
      id: 'q2',
      prompt:
        "A senior engineer argues: \"esbuild, SWC, and oxc are all 'the fast Rust/Go tool' — pick whichever is fastest in a benchmark and standardize on it everywhere.\" What's wrong with treating them as interchangeable?",
      choices: [
        {
          id: 'a',
          text: "Nothing is wrong with it -- they're functionally identical, so benchmark speed is the only axis that matters.",
        },
        {
          id: 'b',
          text: 'They occupy different roles: esbuild is a standalone bundler/transformer used directly or embedded in other tools; SWC is specifically the transform layer Next.js defaults to; oxc is a parser/resolver/transformer/minifier/linter toolkit that Rolldown (and Vite) build on top of. Choosing one over another is usually decided by which larger tool you\'re already using, not a standalone benchmark.',
        },
        { id: 'c', text: 'Only SWC is written in Rust; the other two are Go, so they cannot be compared at all.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "esbuild is Go, not Rust, so speed comparisons across the three even involve different languages. More importantly, they're not competing drop-in replacements for the same job in most real projects -- you get oxc because you use Rolldown/Vite, SWC because you use Next.js, and esbuild either directly or as a dependency of something else.",
    },
    {
      id: 'q3',
      prompt:
        'A team migrating a large webpack app to Vite reports that `import.meta.env.API_URL` is `undefined` in production, even though `.env.production` defines `API_URL=https://api.example.com` and the same variable worked fine under webpack with DefinePlugin. What is the most likely cause?',
      choices: [
        { id: 'a', text: 'Vite does not support .env files in production builds at all.' },
        {
          id: 'b',
          text: "Vite only exposes client-side environment variables whose name is prefixed with VITE_; an unprefixed variable like API_URL is intentionally excluded from import.meta.env to avoid leaking server-only secrets from a shared .env file into client code.",
        },
        { id: 'c', text: 'DefinePlugin values from the old webpack config are still cached and overriding the new value.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "This is a deliberate security boundary in Vite, and the single most common webpack-to-Vite migration bug. The fix is renaming the variable to VITE_API_URL (and updating every reference to import.meta.env.VITE_API_URL), not a caching or tooling issue.",
    },
    {
      id: 'q4',
      prompt:
        "A codebase uses `require.context('./pages', true, /\\.tsx$/)` to auto-register every file in a directory as a route. After moving the build to Vite, this line throws immediately. What's the correct fix, and why isn't there an automated codemod that just works?",
      choices: [
        {
          id: 'a',
          text: "Replace it with import.meta.glob('./pages/**/*.tsx'), which returns an object of specifier to lazy (or eager) import function -- the same underlying goal, but a genuinely different return shape (an object of loaders vs. a context function), so the call sites that consume the result usually need hand edits too.",
        },
        { id: 'b', text: 'Install @vitejs/plugin-require-context, which restores require.context with zero code changes.' },
        { id: 'c', text: 'Nothing changes -- require.context is standard ESM and Vite supports it identically to webpack.' },
      ],
      correctChoiceId: 'a',
      explanation:
        "require.context is a webpack-specific API with no ESM equivalent, so it has no drop-in Vite replacement. import.meta.glob covers the same use case (bulk-importing a directory) but returns a different shape, which is why this is one of the few migration steps that can't be scripted away entirely.",
    },
    {
      id: 'q5',
      prompt:
        'Next.js 16 made Turbopack the default for both `next dev` and `next build`. A team asks whether they still need webpack configured anywhere in their project. When is keeping a webpack fallback actually justified?',
      choices: [
        { id: 'a', text: 'Never -- Turbopack is a strict superset of webpack, so any webpack config still present is dead weight.' },
        {
          id: 'b',
          text: "When the project depends on a webpack-specific loader or plugin that has no Turbopack equivalent yet; Next.js still supports selecting webpack explicitly for exactly this compatibility gap, even though it is no longer the default a new project gets.",
        },
        { id: 'c', text: 'Only for projects still on Next.js 14 or earlier -- any project on 16+ cannot use webpack at all.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "Turbopack becoming the default doesn't mean webpack support was removed -- it means new projects no longer opt into webpack by default. A real compatibility gap (a loader/plugin with no Turbopack port) is a legitimate reason to keep the webpack path selected for now.",
    },
    {
      id: 'q6',
      prompt:
        "Two build-tool blog posts both claim \"we're 20x faster than webpack,\" one for Rspack and one for Vite+Rolldown. A teammate concludes the two projects must be roughly interchangeable. What's the flaw in comparing them purely on that number?",
      choices: [
        { id: 'a', text: "There's no flaw -- if both beat webpack by the same multiple, they're functionally equivalent choices for any project." },
        {
          id: 'b',
          text: 'They target different migration paths and plugin ecosystems: Rspack aims for webpack config/loader/plugin compatibility so an existing webpack app can switch with minimal rewrites, while Vite+Rolldown targets the Rollup plugin API and Vite\'s native-ESM dev-server model -- "how much of my existing setup keeps working" matters as much as the speed multiple, and the two tools answer that differently for a webpack-heavy project.',
        },
        { id: 'c', text: 'The comparison is invalid because Rspack is written in Go and Rolldown is written in JavaScript.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "A speed multiple measured against the same baseline (webpack) doesn't tell you about migration cost, which is often the deciding factor. Rspack's whole pitch is webpack-shaped compatibility for an existing project; Vite's is a different dev-server architecture and Rollup-shaped plugins. Both are legitimately fast and legitimately Rust-based -- the right choice depends on what you're migrating from.",
    },
  ],
};
