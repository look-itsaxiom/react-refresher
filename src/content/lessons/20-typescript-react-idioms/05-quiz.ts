import type { QuizStep } from '../../types';

export const quiz: QuizStep = {
  kind: 'quiz',
  id: 'quiz',
  title: 'Check your understanding',
  questions: [
    {
      id: 'q1',
      prompt:
        'A teammate insists on typing every component as `const Foo: React.FC<Props> = (...) => ...` to "get children for free." What is the accurate response in a codebase on a current `@types/react`?',
      choices: [
        { id: 'a', text: '`React.FC` still adds an implicit `children?: ReactNode`, so this works as intended.' },
        { id: 'b', text: '`React.FC` no longer adds implicit children; `Props` needs its own `children` field (or `PropsWithChildren<Props>`) either way, same as a plain function.' },
        { id: 'c', text: '`React.FC` was removed from `@types/react` entirely and this code no longer compiles.' },
      ],
      correctChoiceId: 'b',
      explanation:
        '`@types/react` dropped the implicit `children` prop from `FC` some time ago specifically because it let components accept children they never rendered. `FC` still exists and still type-checks, but it gives you nothing a plain typed function component doesn\'t — `Props` has to declare `children` itself in both cases.',
    },
    {
      id: 'q2',
      prompt:
        'A `Tooltip` wrapper needs to merge its own internally-managed ref with a `ref` the caller might also pass in, rather than forwarding the caller\'s ref straight to the DOM node. Which prop type should its props extend?',
      choices: [
        { id: 'a', text: '`ComponentProps<\'div\'>`, so the incoming `ref` is included and can be merged directly.' },
        { id: 'b', text: '`ComponentPropsWithoutRef<\'div\'>`, plus its own explicitly typed `ref` field for the merge logic.' },
        { id: 'c', text: '`PropsWithChildren<{}>`, since `ref` is handled outside the props type entirely in React 19.' },
      ],
      correctChoiceId: 'b',
      explanation:
        '`ComponentPropsWithoutRef` strips `ref` from the native element\'s prop type, which is exactly what you want when you\'re not just passing the caller\'s ref straight through — you add your own `ref` field typed the way your merge logic needs, instead of inheriting the native one and fighting it.',
    },
    {
      id: 'q3',
      prompt:
        'A `Toggle` component has `ButtonProps = LinkProps | PlainProps` where `LinkProps` requires `href: string` and `PlainProps` has no `href` field at all. Inside the component, why does `if (\'href\' in props)` correctly narrow `props` to `LinkProps`?',
      choices: [
        { id: 'a', text: 'TypeScript scans both branches for a property of that name and narrows to whichever branch has it (or doesn\'t), the same way it narrows on a literal discriminant field.' },
        { id: 'b', text: 'It doesn\'t narrow anything on its own; a manual type assertion is still required inside the block.' },
        { id: 'c', text: 'It only works because `PlainProps` explicitly declares `href?: never`, which is required for `in` to narrow at all.' },
      ],
      correctChoiceId: 'a',
      explanation:
        'The `in` operator is a supported narrowing form for union types: TypeScript checks which member(s) of the union have a property with that name and narrows accordingly. It works whether the other branch omits the property entirely or declares it as `never` — the `never` trick is sometimes used for extra safety, but is not required for `in` to narrow.',
    },
    {
      id: 'q4',
      prompt:
        'A route table needs to keep each route\'s exact literal `path` string available to TypeScript (so a `<Link to="/billing">` component can validate `to` against a union of real paths) while still being checked against a `Route` shape. Plain annotation (`const routes: Record<string, Route> = {...}`) loses the literal paths. What fixes it without giving up validation?',
      choices: [
        { id: 'a', text: 'Add `as const` after the object and drop the `Route` type entirely.' },
        { id: 'b', text: 'Add `satisfies Record<string, Route>` after the object instead of annotating it.' },
        { id: 'c', text: 'Split the object into two separate declarations, one typed and one untyped, and merge them.' },
      ],
      correctChoiceId: 'b',
      explanation:
        '`satisfies` checks the object against `Record<string, Route>` — the same validation an annotation gives you — without widening the object\'s inferred type. `routes.billing.path` keeps its literal string type, which is what a `to` prop union needs; a plain annotation would widen `path` to `string` on every entry.',
    },
    {
      id: 'q5',
      prompt:
        'A shared component library builds its `.d.ts` files with a tool that requires `isolatedDeclarations`. A reviewer flags an exported function whose return type isn\'t written out explicitly, even though it type-checks fine without one. Why does this flag matter under that setting?',
      choices: [
        { id: 'a', text: 'It doesn\'t — `isolatedDeclarations` only affects `.tsx` files, not plain `.ts` exports.' },
        { id: 'b', text: '`isolatedDeclarations` requires each file\'s declaration output to be producible without looking at any other file, which means every exported function needs an explicit type instead of relying on cross-file inference.' },
        { id: 'c', text: 'It\'s purely a style preference; `isolatedDeclarations` has no effect on declaration emit correctness.' },
      ],
      correctChoiceId: 'b',
      explanation:
        '`isolatedDeclarations` trades a small amount of inference convenience for the ability to emit each file\'s `.d.ts` independently and in parallel, which is what lets some build tools skip a whole-project type-checking pass just to produce declaration files. An exported function whose return type depends on inference from elsewhere breaks that guarantee.',
    },
    {
      id: 'q6',
      prompt:
        'A repo runs `oxlint` on every save and in CI, but a reviewer wants `typescript-eslint`\'s `no-floating-promises` rule enforced too. Why can\'t `oxlint` just add that rule?',
      choices: [
        { id: 'a', text: '`no-floating-promises` needs type information (to know an expression is actually a `Promise`) that a purely syntactic linter like `oxlint` doesn\'t have.' },
        { id: 'b', text: '`oxlint` refuses to implement any rule that `typescript-eslint` already has, to avoid duplication.' },
        { id: 'c', text: 'The rule only applies to `.tsx` files, and `oxlint` doesn\'t lint `.tsx`.' },
      ],
      correctChoiceId: 'a',
      explanation:
        'Type-aware rules need a real type checker to know, for instance, that a given expression\'s type is a `Promise` rather than some other unawaited value. `oxlint`\'s speed comes precisely from working on syntax alone; the trade-off is that this whole category of rule is out of reach for it, which is why teams keep `typescript-eslint`\'s type-aware rules around for a slower, less frequent pass.',
    },
  ],
};
