import type { QuizStep } from '../../types';

export const quiz: QuizStep = {
  kind: 'quiz',
  id: 'quiz',
  title: 'Check your understanding',
  questions: [
    {
      id: 'q1',
      prompt:
        'A workload dashboard query does `select u.id, u.name, count(t.id) from users u join tasks t on t.assignee_id = u.id and t.status <> \'done\' group by u.id, u.name`. Someone reports that a teammate with zero open tasks is missing from the dashboard entirely, not shown with 0. What is wrong, and what is the fix?',
      choices: [
        {
          id: 'a',
          text: "The GROUP BY is missing a column; adding u.id and u.name again won't help but that's the bug.",
        },
        {
          id: 'b',
          text: "The INNER JOIN drops any user with no matching task row before GROUP BY ever runs; switching to a LEFT JOIN keeps every user and count(t.id) correctly returns 0 for unmatched rows (count(*) would not).",
        },
        {
          id: 'c',
          text: "count(t.id) needs to be count(*) instead; the join type is fine.",
        },
      ],
      correctChoiceId: 'b',
      explanation:
        "An INNER JOIN only keeps rows that match on both sides, so a user with zero open tasks never produces a joined row and vanishes before GROUP BY sees them. LEFT JOIN keeps every left-side row and fills the right side with NULLs for no match; count(t.id) counts non-NULL t.id values, so it correctly reports 0 rather than counting a NULL row as if it were a task (which count(*) would do — it counts rows, not non-null values).",
    },
    {
      id: 'q2',
      prompt:
        'A query filters `where assignee_id not in (select id from users where status = \'inactive\')`. On some environments it returns 0 rows even though there are clearly active-assignee tasks. What is the likely cause?',
      choices: [
        {
          id: 'a',
          text: "NOT IN's subquery is returning at least one NULL id; once the list contains a NULL, every comparison against it is UNKNOWN, and NOT IN with any UNKNOWN comparison excludes every row.",
        },
        { id: 'b', text: 'NOT IN silently ignores NULLs in the subquery and this must be a different bug.' },
        { id: 'c', text: 'This is a Postgres version issue; NOT IN with a subquery was deprecated.' },
      ],
      correctChoiceId: 'a',
      explanation:
        "x NOT IN (1, NULL) expands to x <> 1 AND x <> NULL, and x <> NULL is UNKNOWN for every x, which makes the whole AND UNKNOWN, and WHERE treats UNKNOWN like FALSE — so a single NULL anywhere in the subquery's result silently zeroes out the entire query. NOT EXISTS doesn't have this failure mode because it checks row existence, not value equality against a list.",
    },
    {
      id: 'q3',
      prompt:
        'A teammate proposes replacing a `DISTINCT ON (task_id) ... ORDER BY task_id, changed_at desc` query with `row_number() over (partition by task_id order by changed_at desc) ... where rn = 1`, purely to make the query portable to another database someday. Is that a reasonable trade to make today, with no other database in the picture?',
      choices: [
        {
          id: 'a',
          text: "Yes — DISTINCT ON is deprecated in modern Postgres in favor of window functions.",
        },
        {
          id: 'b',
          text: "It's a defensible call if portability is a real near-term requirement, but DISTINCT ON is not deprecated, is standard practice in Postgres codebases, and is shorter and arguably clearer for exactly this latest-per-group case; paying the row_number() verbosity tax against a hypothetical future database is a premature-portability trade, not a correctness one.",
        },
        { id: 'c', text: "No difference — the two produce different results in general, so this isn't really a valid substitution regardless of portability." },
      ],
      correctChoiceId: 'b',
      explanation:
        "DISTINCT ON and the row_number()/filter pattern produce the same result for this query and neither is wrong; the choice is about portability versus concision, not correctness or deprecation. Optimizing for a database migration that isn't scheduled is the kind of premature abstraction worth pushing back on in review — it's fine to make that trade deliberately, but it should be a stated decision, not a reflex.",
    },
    {
      id: 'q4',
      prompt:
        'A recursive CTE computing every task\'s transitive predecessors is timing out on production data, even though the dependency graph has under 500 tasks. What is the most likely structural cause, and what is the first thing to check?',
      choices: [
        {
          id: 'a',
          text: "500 tasks is inherently too many for a recursive CTE; the fix is always to move the computation into application code regardless of the graph's shape.",
        },
        {
          id: 'b',
          text: "A cycle in the dependency data (e.g. a bad row making task A depend on itself transitively) is making the recursion never terminate; check for a missing cycle guard (path array or CYCLE clause) and validate the data for cycles, since a correct DAG of 500 tasks would terminate quickly.",
        },
        { id: 'c', text: "Recursive CTEs are always slower than a loop in application code regardless of graph shape or size, so this is expected." },
      ],
      correctChoiceId: 'b',
      explanation:
        "A true DAG with 500 nodes terminates a recursive CTE quickly — recursion depth is bounded by the longest path, not the node count, and dependency graphs in practice aren't that deep. A timeout at that scale points at either an actual cycle (in which case a query with no cycle guard iterates forever) or an unguarded path-explosion case like a wide diamond-heavy graph; the first thing to check is whether the query has a cycle guard at all, then whether the underlying data has a cycle it should never have allowed.",
    },
    {
      id: 'q5',
      prompt:
        "A dashboard needs page 2 of a task list sorted by created_at descending, using `OFFSET 20 LIMIT 20`. Tasks are actively being created while users page through the list. What concretely goes wrong, and does adding an index on created_at fix it?",
      choices: [
        {
          id: 'a',
          text: "New rows inserted ahead of the current page shift every later row's offset position, so a user can see a row twice (it moved from page 3 into page 2) or miss one (it moved from page 2 into page 1) between requests; an index on created_at makes OFFSET pagination faster but does not fix this correctness problem, since OFFSET still means \"skip N rows in current order\" no matter how fast that skip is.",
        },
        {
          id: 'b',
          text: "Nothing goes wrong as long as the query is wrapped in a transaction; OFFSET/LIMIT is fully consistent under concurrent writes inside a transaction.",
        },
        { id: 'c', text: "An index on created_at fully fixes this, since the index guarantees stable row order across requests." },
      ],
      correctChoiceId: 'a',
      explanation:
        "OFFSET's correctness problem is semantic, not a performance problem an index can fix: \"skip the first N rows in the current sort order\" is a row-count-based position that shifts whenever rows are inserted or deleted ahead of it, regardless of how fast the skip executes. A single query isn't protected by wrapping it in a transaction either, since each page request from the client is typically its own transaction and the underlying table has genuinely changed between them. Keyset pagination (carrying the last row's sort key forward) is the actual fix, because it pins a position to a specific row's value, not a count.",
    },
    {
      id: 'q6',
      prompt:
        "A GraphQL field `readyTasks(projectId: ID!)` runs the ready-to-start query from this lesson once per project every time a list of 30 projects resolves it. What is this, and what is the fix, without changing the SQL itself?",
      choices: [
        {
          id: 'a',
          text: "This is the N+1 problem — one query per parent row instead of one query for the whole batch. The fix is in the resolver, not the SQL: collect all requested project ids first, run the ready-to-start query once with `WHERE project_id = ANY($ids)`, and split the single result set by project_id in application code (a dataloader is the usual mechanism for the collecting step).",
        },
        {
          id: 'b',
          text: "This is fine as long as each individual query is fast; 30 fast queries are equivalent to one query covering 30 projects.",
        },
        { id: 'c', text: "The fix is to add a covering index on the query so each of the 30 calls is instant, which resolves the underlying issue." },
      ],
      correctChoiceId: 'a',
      explanation:
        "30 individually-fast queries still cost 30 round trips (network latency, connection overhead, planner overhead) instead of 1, and that gap gets materially worse as the list grows or the database gets more distant from the app server — an index speeds up each individual query but does nothing about the multiplying factor. The batching fix lives in the resolver layer: gather the ids a GraphQL execution actually needs before touching the database, then issue one query for all of them. 110 covers building this with a dataloader.",
    },
  ],
};
