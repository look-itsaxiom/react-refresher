`FakeWorker` below stands in for a real `Worker`: it runs the handler functions you give it on the
other side of a real `MessageChannel`, so messages genuinely cross a structured-clone boundary
instead of just calling a function directly, the same as a real worker would. Handlers can be sync
or async, and can throw.

Implement:

```ts
type WorkerClient = {
  call<T = unknown>(method: string, payload: unknown): Promise<T>;
  terminate(): void;
};

function createWorkerClient(worker: FakeWorker): WorkerClient
```

`createWorkerClient` wraps `worker` in a request/response protocol:

1. **Correlate by id.** Each `call` posts a message shaped like `{ id, method, payload }` with a
   fresh id, and resolves (or rejects) only when a response carrying that *same* id comes back —
   not just the next message that happens to arrive. `FakeWorker` (like a real worker handling
   several in-flight requests) doesn't guarantee responses come back in the order you sent them.
2. **Two concurrent calls resolve independently.** Calling `call()` twice before the first
   resolves must not lose or mix up either result — whichever response arrives first should
   resolve its own call, regardless of which was sent first.
3. **Propagate errors to the right call.** If the handler for a given call throws, that call's
   promise should reject with an `Error` carrying the handler's message — and it should not affect
   any other in-flight call.
4. **`terminate()`** tears the worker down; no further calls should be attempted on it afterward.

`App.tsx` uses `createWorkerClient` to move the provided `hashItems` computation off the render
path and shows a `data-pending` attribute while a call is in flight — a real version of this would
be the difference between a UI that freezes for the duration of the work and one that stays
responsive. Don't change `FakeWorker` or `hashItems`.
