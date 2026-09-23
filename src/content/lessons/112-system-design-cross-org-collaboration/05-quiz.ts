import type { QuizStep } from '../../types';

export const quiz: QuizStep = {
  kind: 'quiz',
  id: 'quiz',
  title: 'Check your understanding',
  questions: [
    {
      id: 'q1',
      prompt:
        "The interviewer asks: \"A vendor's program share just got revoked because the contract ended. What actually needs to happen, end to end, for that to be safe?\" A candidate answers \"delete the project_shares row, done.\" What's missing?",
      choices: [
        {
          id: 'a',
          text: 'Nothing — once the row is gone, every future check() denies access, which is the whole point.',
        },
        {
          id: 'b',
          text: "Deleting the tuple stops future checks from granting access, but any cached authorization decision and any already-open real-time connection (WebSocket/SSE) for that vendor's users keeps working until the cache expires or the connection is force-closed — the revocation isn't actually complete until both of those are addressed.",
        },
        { id: 'c', text: "It doesn't matter, because real-time connections don't carry authorization state at all." },
      ],
      correctChoiceId: 'b',
      explanation:
        "A relationship tuple is the source of truth, but it isn't the only place a decision lives once you've added caching for latency and long-lived connections for real time. Revocation has to reach both, or a fired vendor keeps watching the program for as long as their tab stays open.",
    },
    {
      id: 'q2',
      prompt:
        "Follow-up: \"Why not just use LWW-per-field for the task's status column too, so a stale client update never gets rejected and the UI feels smoother?\" What's the strongest pushback?",
      choices: [
        {
          id: 'a',
          text: 'LWW is strictly better than optimistic locking for every field, so there\'s no real pushback here.',
        },
        {
          id: 'b',
          text: "LWW silently drops the losing write with no error shown to the user who made it — fine for a status enum where a stale value gets corrected on the next glance, but the tradeoff is real: someone's explicit action (marking a task blocked) can vanish without them ever knowing, which optimistic locking's 409 at least surfaces.",
        },
        { id: 'c', text: 'LWW cannot be implemented without a CRDT library, so it isn\'t a realistic option for a status field.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "Smoother isn't free. Optimistic locking trades a visible interruption (retry the write) for guaranteed no silent data loss; LWW trades that guarantee for silence. Which one is right depends on how much a lost status change actually costs — say that tradeoff by name instead of picking one policy as universally better.",
    },
    {
      id: 'q3',
      prompt:
        "Follow-up: \"You've got a Postgres LISTEN/NOTIFY-based fan-out. A backend process was mid-restart when a task update fired NOTIFY. What happens to that update?\"",
      choices: [
        {
          id: 'a',
          text: "Postgres queues it and redelivers it once the process reconnects, so nothing is lost.",
        },
        {
          id: 'b',
          text: "NOTIFY has no persistence — if no process is LISTENing at the moment it fires, that notification is simply gone; the update itself is still safe in the row, but the fan-out signal for it isn't, which is exactly why a durable outbox-backed change feed (not raw LISTEN/NOTIFY) is the right foundation for anything a client resyncs against with a cursor.",
        },
        { id: 'c', text: 'LISTEN/NOTIFY guarantees delivery as long as the update itself committed successfully.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "LISTEN/NOTIFY is a good wakeup signal and a bad durable log — treat those as two different jobs. The concept step's outbox-fed change feed exists specifically so a reconnecting client can replay from a cursor instead of trusting a pub/sub layer that already dropped what it missed.",
    },
    {
      id: 'q4',
      prompt:
        "Follow-up: \"Your GraphQL schema exposes Task.internalNotes. You've already filtered which tasks a vendor's query can return. Is that enough?\"",
      choices: [
        {
          id: 'a',
          text: "Yes — if the task itself passed the visibility check, every field on it is safe to return.",
        },
        {
          id: 'b',
          text: "No — a query-level filter controls which rows come back, not which fields on an authorized row are safe to expose; a task the vendor is legitimately allowed to see can still have a field, like internalNotes, meant only for the owning org, which needs its own resolver-level check independent of the row-level one.",
        },
        { id: 'c', text: "No — GraphQL cannot support field-level authorization at all, so the field has to be removed from the schema entirely." },
      ],
      correctChoiceId: 'b',
      explanation:
        "Row-level and field-level authorization answer different questions: can you see this task, and can you see this particular field on it. A schema that only implements the first leaks exactly the kind of company-confidential note this whole domain is built to keep private.",
    },
    {
      id: 'q5',
      prompt:
        "Follow-up: \"Why not just event-source everything — make the append-only log the actual source of truth instead of a mutable tasks table plus a separate audit log?\" What's the honest answer?",
      choices: [
        {
          id: 'a',
          text: "Event sourcing is always the right call for an audited domain, so this should be the default architecture.",
        },
        {
          id: 'b',
          text: "Event sourcing gives you point-in-time reconstruction almost for free, but it's a real architectural commitment — every read now replays or relies on a maintained projection — and most teams get the audit trail they actually need (who changed what, when) from a much simpler append-only events table sitting beside a normal mutable schema, without taking on that cost.",
        },
        { id: 'c', text: "An append-only audit table can't answer 'what did this look like at time T', so it's not a real alternative to event sourcing." },
      ],
      correctChoiceId: 'b',
      explanation:
        "The two aren't the same tool at different price points for the same job — full event sourcing solves a broader problem (derive all state from events) than most compliance requirements actually ask for (prove what changed and who did it). Naming the cheaper option as sufficient, and saying why, is a stronger answer than defaulting to the more architecturally ambitious one.",
    },
    {
      id: 'q6',
      prompt:
        "Follow-up: \"Two vendor engineers are editing the same task's free-text description at once. You said CRDTs are the right tool for free text — why not just apply the same mergeText-style three-way line merge you'd use for structured fields?\"",
      choices: [
        {
          id: 'a',
          text: "A line-based three-way merge works identically well for free text and structured fields, so there's no real difference.",
        },
        {
          id: 'b',
          text: "A line-indexed three-way merge only handles same-position edits — it has no way to align an inserted or deleted line, so two people editing the same paragraph concurrently (not just the same line index) produces spurious conflicts or corrupted output; a CRDT like Yjs/Automerge tracks position-independent operations specifically so concurrent inserts and deletes converge correctly without that alignment problem.",
        },
        { id: 'c', text: 'The three-way merge is fine for text; CRDTs only matter for structured fields like status.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "This is exactly the gap the lesson's mergeText exercise is built to expose: it's a fine teaching tool and a bad production text-merge algorithm, because free-text edits routinely insert and delete lines, not just change them in place — which is precisely the case a real CRDT is designed to handle and a line-indexed diff is not.",
    },
  ],
};
