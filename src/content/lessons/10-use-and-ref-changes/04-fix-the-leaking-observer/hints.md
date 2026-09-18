The ref callback already does the setup half correctly (`new FakeObserver()` then `.observe(node)`). It's missing the other half: a returned function.
---
`ref={(node) => { if (!node) return; const observer = new FakeObserver(); observer.observe(node); /* return something here */ }}`
---
React 19 ref callbacks can return a cleanup function, exactly like an effect. Return `() => observer.disconnect()` and React will call it when the node detaches.
