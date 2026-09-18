// Fixture — don't change this. The checks render it and query it both with your
// `getByRoleLite` and with the real Testing Library `getByRole`, and compare the results.
export default function App() {
  return (
    <div>
      <nav aria-label="Primary">
        <a href="/">Skip to content</a>
      </nav>
      <main>
        <h1>Dashboard</h1>
        <h2>Recent orders</h2>
        <button aria-label="Refresh list">↻</button>
        <div role="button" tabIndex={0}>
          Custom button
        </div>
        <button hidden>Archived</button>
        <button aria-hidden="true">Ghost</button>
        <label htmlFor="email">Email</label>
        <input id="email" />
        <label>
          Search
          <input type="text" />
        </label>
        <input type="checkbox" aria-label="Subscribe" />
        <input type="radio" aria-label="Plan A" name="plan" />
        <select aria-label="Country">
          <option>US</option>
        </select>
        <ul>
          <li>Apple</li>
          <li>Banana</li>
          <li>Cherry</li>
        </ul>
        <dialog open aria-label="Confirm">
          Are you sure?
        </dialog>
      </main>
    </div>
  );
}

// TODO: this only handles the explicit `role="..."` attribute. It ignores implicit roles
// (a plain <button> has no explicit role attribute, so this never finds it), the `hidden`/
// `aria-hidden` exclusion, accessible-name computation, and it doesn't throw on zero or
// multiple matches — it just returns the first thing it finds, or null.
export function getByRoleLite(
  container: HTMLElement,
  role: string,
  _options: { name?: string | RegExp; level?: number } = {},
): HTMLElement {
  const match = container.querySelector(`[role="${role}"]`);
  return match as HTMLElement;
}
