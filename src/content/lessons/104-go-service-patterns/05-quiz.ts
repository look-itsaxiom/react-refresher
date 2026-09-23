import type { QuizStep } from '../../types';

export const quiz: QuizStep = {
  kind: 'quiz',
  id: '05-quiz',
  title: 'Check your understanding',
  questions: [
    {
      id: 'q1',
      prompt:
        'A handler does `if err != nil { log.Error("save failed", "err", err); return err }`, and the caller of that function ' +
        'also logs the error it gets back before mapping it to a 500. What should change?',
      choices: [
        { id: 'a', text: 'Nothing — logging at both layers gives more context.' },
        {
          id: 'b',
          text: 'Log once, at the layer that has enough context to decide what to tell the client; every other layer should only wrap and return.',
        },
        { id: 'c', text: 'Only the outermost layer should ever call `fmt.Errorf` with `%w`.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'Logging the same error at every layer it passes through produces duplicate noise for one real failure. Wrap with context as it travels; log once, where the decision about the client-facing response gets made.',
    },
    {
      id: 'q2',
      prompt:
        'You call `store.GetUser(ctx, id)` and get back an error. You want to return a 404 specifically when the user does not exist, ' +
        'and a 500 for anything else. The store returns `fmt.Errorf("querying users table: %w", sql.ErrNoRows)` on a miss. What do you check?',
      choices: [
        { id: 'a', text: '`err.Error() == "querying users table: sql: no rows in result set"`' },
        { id: 'b', text: '`errors.Is(err, sql.ErrNoRows)`' },
        { id: 'c', text: 'Whether `err` is `nil` — Go errors do not carry enough information to distinguish cases.' },
      ],
      correctChoiceId: 'b',
      explanation:
        '`%w` preserves the wrapped error so `errors.Is` can find `sql.ErrNoRows` anywhere in the chain, regardless of what context was added around it. Matching on the formatted string breaks the moment the wrapping message changes.',
    },
    {
      id: 'q3',
      prompt: 'Why does `context.Context` almost always show up as a struct field instead of as the first function parameter?',
      choices: [
        { id: 'a', text: 'It rarely does — storing it on a struct is the anti-pattern; it belongs in the first parameter of any function that might block or do I/O.' },
        { id: 'b', text: 'Because contexts are expensive to construct, so sharing one on a struct avoids repeated allocation.' },
        { id: 'c', text: 'Because a struct field is the only way to make a context available to goroutines the struct starts.' },
      ],
      correctChoiceId: 'a',
      explanation:
        'A context stored on a struct is stale the moment two calls need different deadlines or values, and go vet flags it. Idiomatic Go threads ctx explicitly through every call that can block, as the first parameter.',
    },
    {
      id: 'q4',
      prompt:
        'A worker pool has 4 workers reading from a jobs channel. One worker\'s handler function has a code path that never returns ' +
        '(an infinite retry loop with no context check). What happens under load?',
      choices: [
        { id: 'a', text: 'The other 3 workers pick up the slack automatically; throughput drops by 25% and stabilizes there.' },
        {
          id: 'b',
          text: 'That worker is permanently gone from the pool — effective concurrency drops to 3 forever, with no error or crash to signal it, until the process restarts.',
        },
        { id: 'c', text: 'The program deadlocks immediately, because `sync.WaitGroup.Wait()` never returns.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'A goroutine that never returns doesn\'t crash anything — it just sits there, silently reducing your pool by one, forever. This is why every long-running goroutine needs a `ctx.Done()` (or closed-channel) exit path, even inside "should always succeed eventually" retry logic.',
    },
    {
      id: 'q5',
      prompt:
        'Your `main.go` calls `srv.Shutdown(shutdownCtx)` where `shutdownCtx` has a 5-second timeout, immediately after closing the ' +
        'service\'s database connection pool. A request that was mid-flight when shutdown began tries to run a query 1 second into ' +
        'the drain. What happens, and what should change?',
      choices: [
        {
          id: 'a',
          text: 'The query fails because the pool is already closed — dependencies should close after the drain completes, not before it starts.',
        },
        { id: 'b', text: 'Nothing breaks — `Shutdown` pauses in-flight requests until dependencies are closed, then resumes them.' },
        { id: 'c', text: 'The request is silently dropped and retried by the client, which is the intended behavior.' },
      ],
      correctChoiceId: 'a',
      explanation:
        'The shutdown order is stop accepting -> drain -> close dependencies. Closing the DB pool before the drain finishes turns a graceful shutdown into failed requests for exactly the traffic you were trying to protect.',
    },
    {
      id: 'q6',
      prompt: 'A readiness probe and a liveness probe both start failing for an instance. What is the correct response for each?',
      choices: [
        { id: 'a', text: 'Both should trigger a restart — they mean the same thing.' },
        {
          id: 'b',
          text: 'A failing liveness probe should trigger a restart (the process is stuck); a failing readiness probe should stop new traffic without restarting (e.g. mid-drain, or a dependency is temporarily down).',
        },
        { id: 'c', text: 'Neither should cause any action — probes are informational only, logged but not acted on.' },
      ],
      correctChoiceId: 'b',
      explanation:
        'Liveness answers "is this process broken enough to need a restart"; readiness answers "should traffic be routed here right now". Restarting on a failed readiness check (e.g. during a normal graceful drain) would kill in-flight requests for no reason.',
    },
  ],
};
