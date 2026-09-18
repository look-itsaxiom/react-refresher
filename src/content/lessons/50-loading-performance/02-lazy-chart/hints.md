`React.lazy` takes a function that returns the dynamic import, not the import call
itself — `lazy(() => import('./Chart'))`, not `lazy(import('./Chart'))`. Define that
loader function once, outside the component, so you can both hand it to `lazy()` and
call it yourself from the hover handler.

---

`lazy(...)` returns a component you render like any other, but React needs to know what
to show while its chunk is in flight. Wrap the tab content in `<Suspense
fallback={<something />}>`. Suspense only needs to wrap the part of the tree that might
suspend — wrapping the whole `<main>` or just the tab-switching bit both work.

---

The loader function you passed to `lazy()` is a plain function; nothing stops you from
calling it a second time yourself. `onMouseEnter={() => loadChart()}` on the Chart tab
button starts the fetch immediately. `lazy()` caches the result internally, so calling
the loader again later (when the tab is actually clicked) doesn't re-fetch or re-run the
module — it reuses the same promise.

---

`startTransition` from `react` wraps a state update, not a whole event handler:
`onClick={() => startTransition(() => setActiveTab('chart'))}`. This tells React the tab
switch can be deferred, so if the Chart chunk isn't ready yet, the previous tab stays on
screen (and interactive) instead of the tree immediately unmounting into the Suspense
fallback.

---

Full shape:

```tsx
const loadChart = () => import('./Chart');
const Chart = lazy(loadChart);

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  return (
    <main>
      <nav>
        <button onClick={() => startTransition(() => setActiveTab('overview'))}>Overview</button>
        <button onMouseEnter={() => loadChart()} onClick={() => startTransition(() => setActiveTab('chart'))}>
          Chart
        </button>
      </nav>
      <Suspense fallback={<p>Loading…</p>}>{activeTab === 'overview' ? <Overview /> : <Chart />}</Suspense>
    </main>
  );
}
```
