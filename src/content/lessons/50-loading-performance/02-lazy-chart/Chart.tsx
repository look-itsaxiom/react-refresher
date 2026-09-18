declare global {
  interface Window {
    __chartLoads?: number;
  }
}

// A stand-in for an expensive charting library. Evaluating this module (i.e. the chunk
// arriving and running) increments a counter on `window` so checks can tell when it
// actually loaded, independent of whether the component using it has rendered yet.
window.__chartLoads = (window.__chartLoads ?? 0) + 1;

export default function Chart() {
  return (
    <div>
      <h2>Revenue</h2>
      <p>[imagine a very large chart here]</p>
    </div>
  );
}
