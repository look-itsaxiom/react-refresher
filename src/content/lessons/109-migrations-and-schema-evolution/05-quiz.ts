import type { QuizStep } from '../../types';

export const quiz: QuizStep = {
  kind: 'quiz',
  id: 'quiz',
  title: 'Quiz: migrations and schema evolution',
  questions: [
    {
      id: 'add-column-default',
      prompt:
        'A migration runs `ALTER TABLE tasks ADD COLUMN priority int DEFAULT 0` against a 20-million-row table on Postgres 16. What happens?',
      choices: [
        { id: 'a', text: 'Instant — a constant default is metadata-only, no table rewrite' },
        { id: 'b', text: 'The whole table is rewritten to store the default in every row' },
        { id: 'c', text: 'It fails: you cannot add a column with a default in one statement' },
        { id: 'd', text: 'It succeeds but leaves the column NULL for existing rows' },
      ],
      correctChoiceId: 'a',
      explanation:
        'Since Postgres 11, adding a column with a constant default is a metadata-only change: Postgres records the default and returns it for old rows without touching their storage. The costly, table-rewriting case is a *volatile* default (`default random()`, `default now()`), which genuinely needs a value computed per row.',
    },
    {
      id: 'concurrently-transaction',
      prompt:
        'Why does `CREATE INDEX CONCURRENTLY` refuse to run inside a migration tool\'s wrapping transaction, while a plain `ALTER TABLE` runs fine inside one?',
      choices: [
        { id: 'a', text: 'It needs multiple internal transactions to build the index without holding a long lock, and a surrounding transaction would force it into one' },
        { id: 'b', text: "It's a bug in Postgres that hasn't been fixed" },
        { id: 'c', text: 'It writes to a different schema, and cross-schema DDL cannot be transactional' },
        { id: 'd', text: "It doesn't actually build an index — it only plans one for later" },
      ],
      correctChoiceId: 'a',
      explanation:
        "CONCURRENTLY builds the index in multiple passes, each its own transaction, specifically so it never holds a lock that blocks writers for the whole build. Wrapping it in one outer transaction would defeat that — so Postgres refuses outright. Most migration tools let you mark a single migration file as “run outside a transaction” for exactly this case.",
    },
    {
      id: 'not-null-backfill-order',
      prompt:
        'A column has existing NULLs and needs to become NOT NULL on a live table. Put these in the right order: (1) SET NOT NULL, (2) backfill NULLs, (3) ADD CONSTRAINT ... CHECK (col IS NOT NULL) NOT VALID, (4) VALIDATE CONSTRAINT.',
      choices: [
        { id: 'a', text: '2, 3, 4, 1' },
        { id: 'b', text: '1, 2, 3, 4' },
        { id: 'c', text: '3, 2, 4, 1' },
        { id: 'd', text: '2, 1, 3, 4' },
      ],
      correctChoiceId: 'a',
      explanation:
        'Backfill first, so no row actually violates the rule you are about to add. Then add the CHECK as NOT VALID (instant — only future writes are checked), VALIDATE it separately (scans, but without blocking writers), and only then SET NOT NULL — which, seeing an already-validated equivalent check, skips its own table scan instead of re-verifying every row under a blocking lock.',
    },
    {
      id: 'lock-queue',
      prompt:
        'A trivial, instant `ALTER TABLE ADD COLUMN` (no default) is queued behind a report query that has been running for 10 minutes and holds no conflicting lock on writes — just a long-running SELECT. What happens to new queries that arrive on that table after the ALTER TABLE is submitted?',
      choices: [
        { id: 'a', text: 'They queue behind the ALTER TABLE, which is itself queued behind the report — even though they would have been compatible with the report alone' },
        { id: 'b', text: 'They run fine — only writes are affected, and the ALTER TABLE has no effect on read-only queries' },
        { id: 'c', text: "Postgres reorders the queue so the ALTER TABLE waits last, since it's metadata-only" },
        { id: 'd', text: 'The ALTER TABLE is silently skipped and retried automatically' },
      ],
      correctChoiceId: 'a',
      explanation:
        "Postgres's lock queue for a relation is FIFO, and it isn't just about the operation that's currently running — once ACCESS EXCLUSIVE is waiting in line, every later request, including plain SELECTs that would have been fine running alongside the long report, queues behind it too. That's the exact failure `lock_timeout` prevents: fail the ALTER TABLE fast instead of letting it (and everything behind it) pile up.",
    },
    {
      id: 'rename-strategy',
      prompt:
        "A column needs to be renamed on a table read by several deployed services that can't all redeploy at once. What's the right first migration?",
      choices: [
        { id: 'a', text: 'ALTER TABLE ... RENAME COLUMN, and let each service update on its own schedule' },
        { id: 'b', text: 'Add the new column alongside the old one, keep both in sync (trigger or dual writes), and update any view that exposes the old name' },
        { id: 'c', text: 'Drop the old column and add the new one in a single migration, then hotfix any service that breaks' },
        { id: 'd', text: "Rename it only in a maintenance window so timing doesn't matter" },
      ],
      correctChoiceId: 'b',
      explanation:
        "A bare rename is instant but breaks every service still querying the old name the moment it commits — there's no partial-rollout window. Expand first (both names live and synced), let every service migrate to the new name at its own pace, and only contract (drop the old name) once nothing reads it anymore.",
    },
    {
      id: 'down-migrations',
      prompt:
        'A migration adds a NOT NULL column and backfills it from other columns. Its paired down migration would `ALTER TABLE ... DROP COLUMN`. Why is that down migration dangerous to keep around as a routine rollback tool?',
      choices: [
        { id: 'a', text: "It's not dangerous — running it just undoes the up migration exactly" },
        { id: 'b', text: 'It silently destroys the backfilled data; anything written to the column since the up migration ran is gone if someone runs it against a live database' },
        { id: 'c', text: "It's slower than the up migration, so it isn't worth having" },
        { id: 'd', text: "Postgres doesn't allow dropping a NOT NULL column, so the down migration would just fail" },
      ],
      correctChoiceId: 'b',
      explanation:
        "The down migration reverses the schema, but not safely: it deletes real data that new rows may have written into that column since the up migration shipped. That's why the honest default for a data-bearing change is “roll forward” — fix problems with a new migration — and down migrations get reserved for changes that are genuinely non-destructive to reverse, like a nullable column or an index.",
    },
  ],
};
