import { useState } from 'react';

type Theme = 'light' | 'dark';

// Bug: the card's colors are hardcoded in its inline style, and nothing on this page
// exposes the active theme to CSS. Toggling `theme` changes state but nothing renders
// differently.
export default function App() {
  const [theme, setTheme] = useState<Theme>('light');

  return (
    <>
      <style>{`
        /* TODO: define --card-bg and --card-fg for [data-theme="light"] and
           [data-theme="dark"] here. */
      `}</style>
      <button onClick={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))}>
        Toggle theme
      </button>
      <section>
        <article
          data-testid="card"
          style={{ backgroundColor: '#ffffff', color: '#14171e', padding: 16, borderRadius: 8 }}
        >
          Themed card ({theme})
        </article>
      </section>
    </>
  );
}
