You need `useState` for the on-screen flag and `useEffect` to create and tear down the
observer — this is a textbook "subscribe to something outside React in an effect" case,
the same shape as any other imperative browser API wrapped in a hook.
---
Inside the effect: bail out if `ref.current` is `null`. Otherwise create
`new IntersectionObserver((entries) => { ... })`, call `.observe(ref.current)`, and
return a cleanup function that calls `.disconnect()`.
---
The observer's callback receives an array of entries (it can be watching multiple
targets across its lifetime, even though this one only ever observes one node). Loop
over them and only act on the entry whose `target` is the same node you observed:

```tsx
function useOnScreen(ref: React.RefObject<Element | null>): boolean {
  const [onScreen, setOnScreen] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === node) setOnScreen(entry.isIntersecting);
      }
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [ref]);
  return onScreen;
}
```

A real production version would also pass `{ rootMargin: '200px' }` so content starts
loading slightly before it's actually visible — not required by the checks here, but
worth doing.
