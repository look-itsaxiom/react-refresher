# Build a Zanzibar-style relationship evaluator

Implement a small relationship-based access control (ReBAC) evaluator: `check`, `expand`,
and `visibleTasks`. This is the mechanism described in the first concept step, in miniature —
the same shape as SpiceDB or OpenFGA's `check` API, small enough to implement in one sitting.

## Types

```ts
type Tuple = {
  object: string;   // e.g. 'program:1'
  relation: string; // e.g. 'viewer'
  subject: string;  // e.g. 'user:7', or a userset like 'org:2#member'
};

type Schema = Record<
  string, // object type, e.g. 'program'
  Record<
    string, // relation name, e.g. 'viewer'
    {
      union?: string[]; // relations on the SAME object that also grant this one
      parent?: { relation: string; via: string }; // tupleset-to-userset rewrite
    }
  >
>;
```

A userset subject (`'org:2#member'`) means "everyone who has the `member` relation on
`org:2`" — resolving it means recursively evaluating that relation on that object.

`union: ['editor']` on `viewer` means: anyone who has `editor` on this object also has
`viewer`. `parent: { relation: 'org', via: 'member' }` on a program's `viewer` relation
means: find any tuple `{ object: <this program>, relation: 'org', subject: <some org> }`,
then anyone with `member` on `<some org>` has `viewer` on this program. This is how "the
customer org is related to the program" plus "user X is a member of the customer org"
composes into "user X can view the program," without a tuple written for every user.

## `check`

```ts
function check(schema: Schema, tuples: Tuple[], subject: string, relation: string, object: string): boolean;
```

Return `true` if `subject` has `relation` on `object`, resolving, in any order:

1. **Direct tuples** — a tuple with this exact `object`/`relation` whose `subject` matches
   the one you're checking, or whose `subject` is a userset (`'org:2#member'`) that
   resolves to include it (recurse: does the target subject have relation `member` on
   `org:2`?).
2. **Unions** — for each relation named in this relation's `union` list, recurse: does the
   subject have *that* relation on the same object?
3. **Parent inheritance** — if this relation has a `parent`, find every tuple linking this
   object to another object via `parent.relation`, then recurse: does the subject have
   `parent.via` on that other object?

Guard against cycles: a userset can (accidentally, or via a revoked/rewired schema) refer
back to itself through another object. Track objects/relations you're already resolving on
the current path and treat a repeat as `false` rather than looping forever; also cap
recursion depth as a second line of defense.

## `expand`

```ts
function expand(schema: Schema, tuples: Tuple[], relation: string, object: string): string[];
```

Return every **concrete** subject (never a `type:id#relation` userset string) that has
`relation` on `object`, fully resolving unions, userset subjects, and parent inheritance.
Sort the result ascending.

## `visibleTasks`

```ts
type Task = {
  id: string;
  programId: string;
  ownerOrg: string;
  visibility: 'program' | 'org-internal';
};

function visibleTasks(tuples: Tuple[], schema: Schema, user: string, tasks: Task[]): Task[];
```

A task is visible to `user` when:

- `user` can `view` the task's program (`check(schema, tuples, user, 'viewer', 'program:' + task.programId)`), **and**
- either the task's `visibility` is `'program'` (anyone who can view the program sees it), or
  it's `'org-internal'` **and** `user` is a `member` of the task's `ownerOrg`
  (`check(schema, tuples, user, 'member', 'org:' + task.ownerOrg)`).

Return the matching tasks in their original order.

## Ship something visible

Render a small default `App` that runs `check`/`expand`/`visibleTasks` against the sample
schema and tuples already in the file, and displays the results, so the preview shows
something real.
