You need a second piece of state that lags behind `value` — start it out equal to `value`, then
update it later.

---

`useEffect(() => { const timer = setTimeout(() => setDebounced(value), delayMs); ... }, [value,
delayMs])`. The effect re-runs every time `value` changes, which is exactly when you want to
restart the clock.

---

Don't forget the cleanup: `return () => clearTimeout(timer);`. Without it, every keystroke queues
another timer, and stale ones can still fire and overwrite a newer value later.
