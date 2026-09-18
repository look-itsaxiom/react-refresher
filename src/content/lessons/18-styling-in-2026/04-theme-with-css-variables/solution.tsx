import { useState } from 'react';

type Theme = 'light' | 'dark';

export default function App() {
  const [theme, setTheme] = useState<Theme>('light');

  return (
    <div data-theme={theme}>
      <style>{`
        [data-theme="light"] {
          --card-bg: #ffffff;
          --card-fg: #14171e;
        }
        [data-theme="dark"] {
          --card-bg: #1f2430;
          --card-fg: #e7e9ee;
        }
      `}</style>
      <button onClick={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))}>
        Toggle theme
      </button>
      <section>
        <article
          data-testid="card"
          style={{ backgroundColor: 'var(--card-bg)', color: 'var(--card-fg)', padding: 16, borderRadius: 8 }}
        >
          Themed card ({theme})
        </article>
      </section>
    </div>
  );
}
