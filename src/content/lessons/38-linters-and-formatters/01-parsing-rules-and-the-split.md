A linter and a formatter solve different problems, even though most projects reach for
them together and half the ecosystem (Biome, oxlint's sibling oxfmt) now ships both under
one roof. Knowing why they're separable — and why the industry keeps re-separating them
after every attempt to merge — is the difference between configuring this tooling and
fighting it.

## Both start from the same AST

Every linter and every formatter parses your source into an **abstract syntax tree**: a
tree of nodes like `VariableDeclaration`, `CallExpression`, or `JSXElement`, each with a
`type`, child nodes, and source position. Nothing downstream — rules, fixers, printers —
ever looks at the raw text again after that first parse.

A **rule** is a visitor over that tree: a set of callback functions keyed by node type,
each called once for every node of that type as the tree is walked. `no-unused-vars`
registers a callback for `Identifier` and checks whether the name it binds is ever read
elsewhere; `eqeqeq` registers one for `BinaryExpression` and checks the operator. This is
the same shape you'll build in this lesson's first exercise, and it's the actual internal
API of ESLint, Biome, and oxlint — `context.report({ node, message })` inside a visitor
callback, whatever the surface syntax around it. A rule that can also produce a **fixer**
returns a description of a text edit instead of (or alongside) a diagnostic; the tool
applies non-overlapping fixes and re-parses to catch fixes that only become valid after an
earlier one lands.

A **formatter** walks the same kind of tree but throws away almost everything a linter
cares about — names, correctness, unreachable branches — and keeps only what's needed to
re-print the code with one consistent shape. Prettier's algorithm (and Biome's and
oxfmt's, all descended from the same "Wadler-style pretty-printing" idea) converts each
node into a `Doc`: a small IR of primitives — `text`, `concat`, `line`, `group`,
`indent` — instead of printing strings directly. A `group` is a unit that either prints
fully on one line or has every soft `line` inside it become a real line break, decided
by whether the flattened one-line form fits under `printWidth` (80 by default). Nesting
groups is how `{ a, b, c }` stays inline while a five-property object breaks one property
per line: the outer object is a group, and if it doesn't fit, its child lines force
themselves onto separate lines, at which point trailing commas and consistent indentation
follow mechanically from the `Doc` shape, not from case-by-case string logic.

## Why the two stayed separate tools for a decade

A rule that flags `==` instead of `===` is a **correctness** judgment: it can be wrong
about your intent, but it's checking something true or false about the code's behavior.
A rule that flags two-space indentation instead of four is a **style** preference: there
is no behavioral fact to be right or wrong about. Prettier's founding argument — still
the reason `eslint-config-prettier` exists — is that style arguments in code review are a
waste of a team's attention once a formatter can settle them automatically and
losslessly. Splitting the two tools meant a formatter didn't need to understand semantics
at all — it only needs to reprint a tree faithfully — while a linter didn't need an
opinion on where to put a brace.

**Type-aware rules** are the expensive middle ground: rules like `no-floating-promises`
or `no-unsafe-assignment` can't be answered from syntax alone — you need to know that a
call returns a `Promise` or that a value's type is `any`. Historically that meant
building a full `ts.Program`, which requires reading and checking every file in the
`tsconfig.json`'s scope, not just the one being linted — typescript-eslint's type-aware
preset is commonly 5-10x slower than its syntactic one for exactly this reason. That cost
is why teams gate type-aware rules to CI or a slower pre-push hook rather than running
them on every keystroke.

## The Rust generation changes the trade, not the split

ESLint (JavaScript, plugin-based, flat config only since v9, and mandatory since v10 — a
`.eslintrc*` file is no longer read at all) and Prettier (JavaScript) are still the most
extensible points in the ecosystem: any npm package can ship an ESLint plugin or a
Prettier plugin, which is why `eslint-plugin-jsx-a11y`, `eslint-plugin-react-hooks`, and
dozens of framework-specific rule sets exist. Biome and oxlint (both Rust) and oxfmt
(Rust, in beta since February 2026) trade a chunk of that extensibility for raw speed —
oxlint's syntactic rules and Biome's linter both run at a different order of magnitude
than ESLint on a cold cache, and Oxfmt's early benchmarks put it roughly 30x faster than
Prettier. The catch has been type-aware rules and third-party plugins: Rust tools
couldn't lean on the TypeScript compiler the way typescript-eslint does, and a JS
plugin API for oxlint and Biome only stabilized well after their syntactic linters did.
2026 closed most of that gap from two directions at once — Biome shipped a
Vercel-sponsored type-inference engine that answers rules like `noFloatingPromises`
without invoking `tsc` at all, and oxlint's `tsgolint` reached a stable v7 that builds
real `ts.Program`s on top of `typescript-go` (the Go compiler that ships as TypeScript
7) for the rules Biome's lighter inference doesn't cover.

This repo currently has no linter configured at all — type safety comes from
`tsc --noEmit` and behavior from Vitest, which catches real bugs but nothing about hook
rules, accessibility, or unused code. The next step walks through what to add and why.

### Further reading (optional)
- [ESLint configuration migration guide](https://eslint.org/docs/latest/use/configure/migration-guide)
- [Biome v2 — codename Biotype](https://biomejs.dev/blog/biome-v2/)
- [Biome partners with Vercel to improve type inference](https://biomejs.dev/blog/vercel-partners-biome-type-inference/)
- [Oxlint type-aware linting](https://oxc.rs/docs/guide/usage/linter/type-aware.html)
- [Prettier: Rationale](https://prettier.io/docs/rationale)
