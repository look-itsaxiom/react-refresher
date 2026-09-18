import type { QuizStep } from '../../types';

export const quiz: QuizStep = {
  kind: 'quiz',
  id: 'quiz',
  title: 'Check your understanding',
  questions: [
    {
      id: 'q1',
      prompt:
        'Given `type Boxed<T> = T extends unknown ? { value: T } : never`, what does ' +
        '`Boxed<string | number>` resolve to, and why?',
      choices: [
        { id: 'a', text: '`{ value: string | number }` — the union is checked as a whole against `unknown`.' },
        { id: 'b', text: '`{ value: string } | { value: number }` — a naked type parameter conditional distributes over each union member separately.' },
        { id: 'c', text: '`never` — no member of a union extends a bare `unknown` check.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'A conditional type distributes when the checked type is a naked type parameter and the input is a union: TypeScript applies the conditional to each member independently and unions the results. To check the union as one thing instead, wrap both sides in a tuple: `[T] extends [unknown] ? ... : ...`.',
    },
    {
      id: 'q2',
      prompt:
        'A route table needs literal path strings preserved (for a template-literal params type to work) AND ' +
        'validation that every entry has a `path: string` and a `handler` function, even though different ' +
        'entries\' handlers take different, incompatible parameter shapes. Plain `satisfies RouteDef<string>[]` ' +
        '(where `RouteDef<Path>` types `handler` as `(params: ExtractParams<Path>) => void`) fails to compile. Why?',
      choices: [
        { id: 'a', text: '`satisfies` cannot be used on arrays, only on plain objects.' },
        { id: 'b', text: 'Each entry\'s specific handler (say, one requiring `{ id: string }`) is contravariantly incompatible with the wider `RouteDef<string>` handler type, which only guarantees `{}`-shaped params.' },
        { id: 'c', text: 'Template literal types can never appear inside a `satisfies` clause.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'Function parameters are checked contravariantly: a handler that requires a specific shape like `{ id: string }` is not assignable to a slot that only promises callers `{}`-shaped params, because that handler would break if actually called with an arbitrary `{}`. The fix used in the router exercise is to validate against a target whose handler parameter is typed `never` — since `never` is assignable to any type, a `never`-parameter function type is contravariantly compatible with a handler of any specific shape, so the shape check passes without widening.',
    },
    {
      id: 'q3',
      prompt:
        'A `parseConfig(input: unknown)` function narrows `input` through several `typeof` and `in` checks, ' +
        'then falls through to a final `else` branch it believes is unreachable. What is the correct way to ' +
        'make the compiler enforce that belief, rather than just adding a comment?',
      choices: [
        { id: 'a', text: 'Change the final branch to `return input as never;`, which silences the compiler regardless of whether the branch is actually reachable.' },
        { id: 'b', text: 'Call a function typed `(value: never) => never` with the narrowed value in that branch; if a case was missed, the value there won\'t narrow to `never` and the call fails to compile.' },
        { id: 'c', text: 'Add `// @ts-expect-error` above the branch, since it documents that the branch shouldn\'t be hit.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'This is the `assertNever` pattern: `never` is the type with no values, so only a genuinely exhausted set of narrowings leaves the compiler believing the remaining value is `never`. Passing it into a function whose parameter is typed `never` turns "I added a new case but forgot to handle it" into a compile error instead of a silent runtime gap. Casting with `as never` (option a) achieves the opposite — it forces compilation regardless of whether the branch is truly unreachable, which is exactly the bug this pattern exists to catch.',
    },
    {
      id: 'q4',
      prompt:
        'A team upgrades their build to TypeScript 7.0 for the faster `tsc`, but CI starts failing on the ' +
        '`typescript-eslint` step specifically, with errors tracing into the type-aware rules. What is the ' +
        'most likely cause, and the standard interim fix?',
      choices: [
        { id: 'a', text: 'TypeScript 7.0 removed `strict` mode, so `typescript-eslint`\'s rules can no longer assume strict types; the fix is to re-enable `strict` explicitly.' },
        { id: 'b', text: 'TypeScript 7.0 shipped without a public programmatic compiler API (planned for 7.1), which `typescript-eslint`\'s type-aware rules depend on directly; the interim fix is running those rules against the `@typescript/typescript6` compatibility package\'s `tsc6` while compiling with 7.0.' },
        { id: 'c', text: '`typescript-eslint` was deprecated in favor of `oxlint` in TypeScript 7.0 and no longer functions on any TypeScript version.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'TypeScript 7.0\'s Go rewrite didn\'t ship `ts.createProgram` and friends — tools built directly against the old JS API, like `typescript-eslint`\'s type-aware rules, can\'t run against it yet. Microsoft\'s `@typescript/typescript6` package re-exports the old API under a `tsc6` binary specifically so teams can compile with the fast 7.0 `tsc` while keeping type-aware linting on the compatible API until 7.1 exposes a native one.',
    },
    {
      id: 'q5',
      prompt:
        'A shared internal package enables `isolatedDeclarations` so a bundler can emit `.d.ts` files without ' +
        'a whole-project type-check pass. A reviewer flags an exported function whose return type is inferred ' +
        'from a call to a function in another file, with no explicit annotation. Why does this matter under ' +
        '`isolatedDeclarations`, specifically?',
      choices: [
        { id: 'a', text: 'It doesn\'t — `isolatedDeclarations` only restricts syntax like `enum` and `namespace`, not inference.' },
        { id: 'b', text: '`isolatedDeclarations` requires each file\'s declaration output to be derivable by looking at that file alone; an inferred return type that depends on another file\'s types breaks the "isolated" guarantee the flag exists to provide.' },
        { id: 'c', text: 'Cross-file type inference was removed entirely in TypeScript 6.0, so this code no longer compiles at all.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'The whole point of `isolatedDeclarations` is letting a tool emit one file\'s `.d.ts` without reading every other file it happens to import from — which is what makes declaration emit parallelizable and independent of a full project type-check. An exported function whose return type can only be known by chasing inference into another file defeats that, so the flag requires an explicit annotation there instead.',
    },
    {
      id: 'q6',
      prompt:
        'A route table is built as `createRouter([{ path: \'/a\', handler: h1 }, { path: \'/b\', handler: h2 }])`, ' +
        'passed as an inline array literal (no prior `as const`, no intermediate variable). `createRouter` is ' +
        'declared `function createRouter<const Routes extends readonly AnyRouteDef[]>(routes: Routes)`. What ' +
        'does the `const` modifier on the type parameter change here, compared to a plain `<Routes extends ...>`?',
      choices: [
        { id: 'a', text: 'Nothing observable — `const` type parameters only affect primitive literals like strings and numbers, never array or object literals.' },
        { id: 'b', text: 'Without `const`, TypeScript would widen the inline array to a plain `AnyRouteDef[]` (losing each entry\'s literal `path` and specific handler param type) before inferring `Routes`; `const` keeps the tuple and each element\'s literal/narrow type exactly as written.' },
        { id: 'c', text: '`const` makes the `routes` parameter read-only at runtime, throwing if the function body tries to reassign an element.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'Normally, inferring a type parameter from an array or object literal argument widens it the same way a `let` binding would — string literals become `string`, and a fixed-length array becomes a same-element-type array rather than a tuple. A `const` type parameter (TypeScript 5.0+) infers as if the argument had `as const` applied, keeping literal path strings and each tuple slot\'s own specific type — exactly what a per-route `MatchResult` mapped type needs to discriminate correctly later. It\'s a compile-time inference behavior, not a runtime immutability enforcement.',
    },
  ],
};
