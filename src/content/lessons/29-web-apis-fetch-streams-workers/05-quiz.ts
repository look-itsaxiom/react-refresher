import type { QuizStep } from '../../types';

export const quiz: QuizStep = {
  kind: 'quiz',
  id: 'quiz',
  title: 'Check your understanding',
  questions: [
    {
      id: 'q1',
      prompt:
        'You need a request to time out after 4 seconds AND be cancellable by a "stop" button the user can click at any time. What is the idiomatic way to wire this up with one `fetch` call?',
      choices: [
        {
          id: 'a',
          text: 'Pass `signal: AbortSignal.any([AbortSignal.timeout(4000), stopButtonSignal])`, so the fetch aborts on whichever fires first.',
        },
        {
          id: 'b',
          text: 'Call `fetch` twice, once with a timeout signal and once with the stop-button signal, and use whichever settles first.',
        },
        { id: 'c', text: 'Set `fetch(url, { timeout: 4000 })` and attach the stop button with `addEventListener("click", () => fetch.abort())`.' },
      ],
      correctChoiceId: 'a',
      explanation:
        '`AbortSignal.timeout(ms)` returns a signal that fires on its own after the delay, and `AbortSignal.any([...])` fans multiple signals into one that fires as soon as any input does. Combining them is the standard way to give a single fetch both a deadline and a manual cancel path without hand-rolling timers. `fetch` has no `timeout` option, and issuing two real requests to race them wastes a connection.',
    },
    {
      id: 'q2',
      prompt:
        "A component fetches a large JSON array and does `await response.json()`, then works with the parsed array. A teammate suggests switching to reading `response.body` directly and parsing incrementally instead. When does that switch actually help, and when is it wasted effort?",
      choices: [
        {
          id: 'a',
          text: "It helps when you can act on partial data as it arrives (render items as they stream, stop early once you've seen enough) or want to avoid buffering the whole response before doing anything. It's wasted effort if you need the complete array before you can do anything useful with it anyway — you're just reimplementing what response.json() already does, with more code.",
        },
        { id: 'b', text: 'It always helps: streaming is strictly faster than buffering for any JSON payload, regardless of what the code does with the result.' },
        { id: 'c', text: "It never helps for JSON specifically — streaming only applies to text formats like NDJSON, not to a single JSON array." },
      ],
      correctChoiceId: 'a',
      explanation:
        "Streaming's benefit is being able to act before the whole payload has arrived, or avoiding holding the whole thing in memory at once. If the component's very next line needs the full parsed array regardless (e.g., to sort it), there's no partial-data benefit to exploit, and response.json() is simpler and just as correct. A single large JSON array *can* be streamed (with an incremental JSON parser), but the value of doing so still depends on whether anything useful can happen before it's complete.",
    },
    {
      id: 'q3',
      prompt:
        'A component does `worker.postMessage(hugeImageBuffer)`, where `hugeImageBuffer` is a 200MB `ArrayBuffer`, and the main thread never needs to touch that buffer again afterward. What is the more efficient call, and why?',
      choices: [
        {
          id: 'a',
          text: '`worker.postMessage(hugeImageBuffer, [hugeImageBuffer])` — listing the buffer as a transferable moves ownership to the worker with no copy, instead of structured-clone copying all 200MB.',
        },
        { id: 'b', text: 'There is no more efficient version; postMessage always copies, and the size only matters for how long the copy takes.' },
        { id: 'c', text: 'Wrap it in a `SharedArrayBuffer` first — that is required any time you want to avoid a copy.' },
      ],
      correctChoiceId: 'a',
      explanation:
        "Structured clone (the default for postMessage) deep-copies the data, which for a 200MB buffer is a real cost in time and memory. Listing an ArrayBuffer in the transfer list moves it instead of copying it — ownership passes to the receiving side, and the sender's reference becomes unusable immediately. SharedArrayBuffer solves a different problem (both sides reading and writing the *same* memory concurrently) and requires COOP/COEP headers; it is not the tool for a one-time hand-off.",
    },
    {
      id: 'q4',
      prompt:
        'Two calls happen back to back: `client.call("slow", a)` then `client.call("fast", b)`, against a real worker handling both concurrently. An engineer implements the client by keeping a single `let pendingResolve` variable that gets overwritten on every call and invoked by the next `message` event. What breaks, and what is the right fix?',
      choices: [
        {
          id: 'a',
          text: "If fast's response arrives before slow's (plausible, since it's called fast), it resolves whatever `pendingResolve` currently points to — which, after the second call overwrote it, is fast's resolver — but slow's call never gets resolved by its own response, and fast's own resolver was already clobbered too. The fix is a Map from request id to {resolve, reject}, populated per call and looked up by the id in each response.",
        },
        { id: 'b', text: 'Nothing breaks — message events are always delivered in the order the corresponding requests were sent, so `pendingResolve` always matches the right call.' },
        { id: 'c', text: 'The fix is to make the worker process requests one at a time instead of concurrently, so responses are guaranteed to come back in order.' },
      ],
      correctChoiceId: 'a',
      explanation:
        "A single shared 'next resolver' variable assumes exactly one call is ever in flight, or that responses always arrive in send order — neither holds once calls can be concurrent and take different amounts of time. Tagging each request with an id and keeping a map of id → {resolve, reject}, resolved by looking up the id on the matching response, is what makes concurrent calls correct regardless of arrival order. Serializing the worker just hides the bug under conditions where it happens not to trigger it.",
    },
    {
      id: 'q5',
      prompt:
        'A feature needs "when the user logs out in one browser tab, every other open tab for the same site should immediately show the logged-out state" — no page reload, no polling. Which API is the direct fit, and why not `localStorage` polling or a WebSocket?',
      choices: [
        {
          id: 'a',
          text: "BroadcastChannel — every same-origin tab/window that opens a channel with the same name receives messages posted to it instantly, with no server round trip and no polling. A WebSocket would work but requires a server to relay the message between tabs; polling localStorage works but adds latency and busywork proportional to the poll interval.",
        },
        { id: 'b', text: 'SharedArrayBuffer — it is the standard way to share state like login status across tabs.' },
        { id: 'c', text: 'This is impossible without a server round trip; the browser has no cross-tab communication primitive.' },
      ],
      correctChoiceId: 'a',
      explanation:
        "BroadcastChannel exists specifically for same-origin cross-context messaging — tabs, windows, workers — with no server involved. A WebSocket could relay the message too, but that means routing a same-machine, same-browser event through a server and back, pure overhead for this case. localStorage polling works but trades correctness for a fixed latency window and constant wasted reads. SharedArrayBuffer is for shared memory between threads within the same page's set of contexts under COOP/COEP, not a pub/sub mechanism, and isn't the tool for this.",
    },
    {
      id: 'q6',
      prompt:
        "A teammate wants to move a form's `validate(values)` function — a pure function that runs on every keystroke and takes under a millisecond — into a Web Worker, reasoning that \"workers make things faster.\" Is this a good idea?",
      choices: [
        {
          id: 'a',
          text: "No. Workers help when work is CPU-heavy enough to visibly block the main thread; a sub-millisecond validator isn't that, and every call now pays a real cost (structured clone of `values`, a message round trip, and inherent async latency it didn't have before) for no benefit, while adding real complexity (an RPC protocol, worker lifecycle management).",
        },
        { id: 'b', text: "Yes — moving any function to a worker makes it run faster, since it now executes on a separate CPU core in parallel with the main thread." },
        { id: 'c', text: 'Yes, but only if the function is also wrapped in a `SharedArrayBuffer` for shared memory.' },
      ],
      correctChoiceId: 'a',
      explanation:
        "A worker doesn't make a function itself run faster — it moves where it runs, at the cost of a serialization/message round trip and turning a synchronous call into an asynchronous one. That cost is worth paying only when the function would otherwise block the main thread long enough to be felt (dropped frames, unresponsive input) — a sub-millisecond validator never reaches that threshold, so the switch is pure overhead and complexity with no user-facing upside.",
    },
  ],
};
