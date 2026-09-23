import type { QuizStep } from '../../types';

export const quiz: QuizStep = {
  kind: 'quiz',
  id: 'quiz',
  title: 'Check your understanding',
  questions: [
    {
      id: 'q1',
      prompt:
        'A `Vendor` type has a `Rename(name string)` method with a pointer receiver (`func (v *Vendor) Rename(...)`). Every other method on `Vendor` uses a value receiver. What is the practical problem with mixing them?',
      choices: [
        { id: 'a', text: 'Nothing — Go picks whichever receiver type is more efficient at compile time.' },
        { id: 'b', text: 'A `Vendor` value (not a `*Vendor`) may fail to satisfy an interface that includes `Rename`, even though a `*Vendor` does.' },
        { id: 'c', text: 'It is a syntax error to mix pointer and value receivers on the same type.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "It compiles, but a type's method set for interface satisfaction differs by receiver kind: a `*Vendor`'s method set includes both pointer- and value-receiver methods, but a plain `Vendor`'s method set only includes the value-receiver ones. Mixing receivers means `var s Stringer = vendorValue` can fail to compile where `var s Stringer = &vendorValue` succeeds — confusing enough that the convention is to make all of a type's methods pointer receivers once any one of them needs to be.",
    },
    {
      id: 'q2',
      prompt:
        '`base := make([]int, 3, 8)` (length 3, capacity 8). You call `withExtra := append(base, 99)`, then set `withExtra[0] = -1`. What happens to `base[0]`?',
      choices: [
        { id: 'a', text: 'It is still whatever it was — `append` always copies.' },
        { id: 'b', text: 'It becomes `-1` too, because `withExtra` still shares `base`\'s backing array (capacity 8 had room for the append).' },
        { id: 'c', text: 'It panics, because two slices cannot reference the same backing array.' },
      ],
      correctChoiceId: 'b',
      explanation:
        "`append` reuses the backing array when there's spare capacity, so `withExtra` and `base` alias here. This is the classic `append` aliasing gotcha — it disappears once an `append` actually has to grow past capacity (a fresh backing array gets allocated), which is exactly what makes it so easy to miss in a quick test that happens to trigger a reallocation.",
    },
    {
      id: 'q3',
      prompt:
        'Two goroutines need to hand a stream of parsed `Task` values from a producer to a consumer, one at a time, with the producer blocking until each one is picked up. A third goroutine just needs to safely increment a shared request counter. Which pairing is idiomatic?',
      choices: [
        { id: 'a', text: 'A channel for the task handoff, a `sync.Mutex` for the counter.' },
        { id: 'b', text: 'A `sync.Mutex` for both — channels are only for goroutine creation.' },
        { id: 'c', text: 'A channel for both — a mutex should never appear in idiomatic Go.' },
      ],
      correctChoiceId: 'a',
      explanation:
        '"Share memory by communicating" is a guideline, not an absolute: use a channel when goroutines are handing off ownership of values (the producer/consumer case, where an unbuffered channel even gives you the backpressure described), and a plain `sync.Mutex` when goroutines are just touching one small shared piece of state, like a counter. A mutex-guarded counter is completely idiomatic Go.',
    },
    {
      id: 'q4',
      prompt: 'Why does `errors.Is(err, ErrNotFound)` exist instead of just writing `err == ErrNotFound`?',
      choices: [
        { id: 'a', text: 'It is purely stylistic — the two are equivalent in every case.' },
        { id: 'b', text: '`==` cannot compare interface values in Go.' },
        { id: 'c', text: '`err` is often a *wrapped* error (via `fmt.Errorf("...: %w", ErrNotFound)`); `==` would compare the wrapper to the sentinel and always be false, while `errors.Is` unwraps the chain looking for a match.' },
      ],
      correctChoiceId: 'c',
      explanation:
        'Wrapping with `%w` is how Go attaches context to an error without losing the original for programmatic checks. `err == ErrNotFound` only succeeds if `err` *is* the sentinel value itself, not a wrapper around it — which is almost never true by the time an error has propagated up a few calls. `errors.Is` walks `Unwrap()` calls down the chain checking each layer for a match.',
    },
    {
      id: 'q5',
      prompt: 'A function declares `var tasks map[string]Task` and never assigns it, then a later branch runs `tasks["PROJ-1"] = Task{}`. What happens?',
      choices: [
        { id: 'a', text: 'It panics: assignment to entry in nil map.' },
        { id: 'b', text: 'It works fine — the map is created implicitly on first write, like a JS object.' },
        { id: 'c', text: 'It silently does nothing.' },
      ],
      correctChoiceId: 'a',
      explanation:
        "A declared-but-unassigned map has the zero value `nil`. Reading from a nil map is safe and behaves like an empty map, but writing to one panics — there's no implicit `make` on first assignment the way an object literal auto-vivifies in JS. Always `make(map[K]V)` (or use a map literal) before you write into a map you didn't receive already populated.",
    },
    {
      id: 'q6',
      prompt:
        'You need to fetch 200 vendor records with a concurrency cap of 10 in-flight requests, and stop as soon as any request fails. Which primitive is the natural fit for enforcing the cap of 10?',
      choices: [
        { id: 'a', text: 'A buffered channel with capacity 10, used as a semaphore.' },
        { id: 'b', text: 'A `sync.Mutex` locked around each fetch.' },
        { id: 'c', text: 'Ten separate `sync.WaitGroup`s, one per concurrent slot.' },
      ],
      correctChoiceId: 'a',
      explanation:
        "A buffered channel used as a semaphore is the idiomatic bound-concurrency pattern in Go: sending into it before a fetch blocks once 10 are already in flight, and receiving from it after a fetch frees a slot. A mutex serializes access to shared *state*, not concurrent work itself — locking around each fetch would make them run one at a time, not ten at a time.",
    },
  ],
};
