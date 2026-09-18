Keep a `Map<number, { resolve, reject }>` closed over inside `createWorkerClient`, plus a
`nextId` counter. `call()` generates an id, stores its `resolve`/`reject` in the map under that
id, and posts `{ id, method, payload }`. Register exactly **one** `'message'` listener on the
worker (not one per call) that looks up `pending.get(response.id)`, removes it from the map, and
resolves or rejects it based on `response.ok`.

---

Registering a listener per call and resolving on "the next message" is the bug the concurrent-call
check catches: if call A is sent before call B but B's response arrives first, a "resolve on next
message" implementation would incorrectly resolve A's promise with B's result. Look the response
up by `id` in the map instead of relying on arrival order at all.

---

For errors: `FakeWorker` posts back `{ id, ok: false, error: string }` when a handler throws (it
never lets the exception escape as a thrown error on your side — it's always a *message*).
Your listener needs to check `response.ok` and call `reject(new Error(response.error))` for the
matching pending entry, not just always `resolve`.

---

Full shape:

```ts
export function createWorkerClient(worker: FakeWorker): WorkerClient {
  let nextId = 0;
  const pending = new Map<number, { resolve: (value: unknown) => void; reject: (reason: unknown) => void }>();

  worker.addEventListener('message', (event) => {
    const response = event.data;
    const entry = pending.get(response.id);
    if (!entry) return;
    pending.delete(response.id);
    if (response.ok) entry.resolve(response.result);
    else entry.reject(new Error(response.error));
  });

  return {
    call(method, payload) {
      const id = nextId++;
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
        worker.postMessage({ id, method, payload });
      });
    },
    terminate() {
      worker.terminate();
      pending.clear();
    },
  };
}
```
