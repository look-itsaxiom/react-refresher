import type { QuizStep } from '../../types';

export const quiz: QuizStep = {
  kind: 'quiz',
  id: 'quiz',
  title: 'Quiz',
  questions: [
    {
      id: 'small-table-seq-scan',
      prompt:
        'A `Seq Scan` shows up in `EXPLAIN` for a query against a table with only 200 rows, even though the filtered column has an index. What should you conclude?',
      choices: [
        { id: 'a', text: 'The index is broken and needs to be rebuilt with REINDEX.' },
        { id: 'b', text: 'This is very likely the right plan — a sequential scan of 200 rows can beat an index lookup plus random heap access for each match.' },
        { id: 'c', text: 'ANALYZE has never been run on this table.' },
        { id: 'd', text: 'The query needs a hint to force the planner to use the index.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'For small tables, the cost model correctly favors a sequential scan: reading a handful of pages in order is cheaper than the random access an index lookup plus per-row heap fetch requires. This is expected behavior, not a bug — "why isn\'t my index being used" often has this answer for small or low-selectivity tables.',
    },
    {
      id: 'composite-order',
      prompt:
        'A query filters `WHERE tenant_id = $1 AND created_at > $2` and sorts `ORDER BY created_at`. Which composite index best serves it?',
      choices: [
        { id: 'a', text: '(created_at, tenant_id)' },
        { id: 'b', text: '(tenant_id, created_at)' },
        { id: 'c', text: 'Two separate single-column indexes, one on each' },
        { id: 'd', text: 'It doesn\'t matter — Postgres reorders index columns automatically' },
      ],
      correctChoiceId: 'b',
      explanation:
        'Equality columns go first, range columns after — (tenant_id, created_at) lets the equality filter narrow to a contiguous range of the index first, then the range condition and the ORDER BY are both served by created_at within that range, with no separate sort. (created_at, tenant_id) can still be used, but only for the range condition; it can\'t narrow by tenant_id efficiently within the index, and two single-column indexes can\'t be combined as cheaply as one composite index in this shape.',
    },
    {
      id: 'unused-index',
      prompt:
        'In a real Postgres instance (not PGlite), how do you find out whether an existing index is actually used by any query in production?',
      choices: [
        { id: 'a', text: 'Run EXPLAIN on every query in the codebase by hand' },
        { id: 'b', text: 'Check pg_stat_user_indexes.idx_scan for that index after a representative period of traffic' },
        { id: 'c', text: 'Drop it and see if anything breaks' },
        { id: 'd', text: 'Check the index\'s size — small indexes are unused' },
      ],
      correctChoiceId: 'b',
      explanation:
        'pg_stat_user_indexes.idx_scan counts how many times an index has actually been scanned since statistics were last reset. A count of 0 after enough production traffic to be representative is strong evidence the index is pure write-amplification cost with no read benefit. PGlite doesn\'t implement this view, so you can\'t run this check in this course\'s sandbox — know the query for a real deployment.',
    },
    {
      id: 'fk-index',
      prompt: 'Why does a foreign key column almost always need its own index?',
      choices: [
        { id: 'a', text: 'Postgres refuses to create a foreign key without one' },
        { id: 'b', text: 'Postgres automatically indexes the referenced primary key, but not the referencing column — without an index there, every DELETE/UPDATE of a referenced row does a sequential scan of the referencing table to check for dependents' },
        { id: 'c', text: 'It speeds up INSERTs into the referencing table' },
        { id: 'd', text: 'It\'s required for the JOIN planner to consider a hash join' },
      ],
      correctChoiceId: 'b',
      explanation:
        'The referenced side (usually a primary key) is indexed automatically. The referencing side is not, and Postgres has to scan it to enforce the foreign key whenever a referenced row is deleted or its key is updated — an unindexed referencing column turns that into a sequential scan that gets slower as the table grows.',
    },
    {
      id: 'nested-loop-smell',
      prompt:
        'EXPLAIN ANALYZE shows a Nested Loop whose inner side is `Seq Scan on tasks ... (actual time=0.004..3.719 rows=1 loops=240)`. What does loops=240 tell you?',
      choices: [
        { id: 'a', text: 'The query ran 240 times total, unrelated to the inner scan' },
        { id: 'b', text: 'The inner Seq Scan was executed 240 separate times, once per outer row — the per-scan cost looks small, but it\'s paid 240 times over' },
        { id: 'c', text: 'The planner is uncertain and is retrying the plan' },
        { id: 'd', text: 'loops is just a display artifact and can be ignored' },
      ],
      correctChoiceId: 'b',
      explanation:
        'loops=N means that plan node executed N times as the inner side of an outer loop. A cheap-looking per-execution time (3.7ms) multiplied by 240 executions is where the real cost hides — this is the database-side shape of N+1, and it\'s invisible if you only look at a single node\'s own cost without noticing loops.',
    },
    {
      id: 'jsonb-vs-btree',
      prompt: 'You need to filter rows where a jsonb column contains {"status": "active"}. Which index type serves that, and why not a plain B-tree?',
      choices: [
        { id: 'a', text: 'A B-tree on the whole jsonb column — B-trees can index any data type' },
        { id: 'b', text: 'GIN, because it indexes the individual keys/values inside the jsonb document, which a B-tree (built for ordering scalar values) can\'t do for containment queries' },
        { id: 'c', text: 'BRIN, because jsonb columns are always append-only' },
        { id: 'd', text: 'No index helps; jsonb containment always requires a sequential scan' },
      ],
      correctChoiceId: 'b',
      explanation:
        'A B-tree orders whole values and answers equality/range questions on that ordering; it has no way to answer "does this composite value contain that sub-value." GIN builds an inverted index over the document\'s inner keys and values, which is exactly what @> containment needs.',
    },
  ],
};
