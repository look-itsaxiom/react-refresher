import { useState } from 'react';

type Theme = 'light' | 'dark';

function Header({ theme, onToggle }: { theme: Theme; onToggle: () => void }) {
  return (
    <header data-testid="header">
      <ThemeToggle theme={theme} onToggle={onToggle} />
    </header>
  );
}

function ThemeToggle({ theme, onToggle }: { theme: Theme; onToggle: () => void }) {
  return <button onClick={onToggle}>{theme === 'light' ? 'Switch to dark' : 'Switch to light'}</button>;
}

// Sidebar and StatusBadge intentionally take no props: they shouldn't need to know
// where the theme comes from. That's the whole point of this exercise.
function Sidebar() {
  return (
    <aside data-testid="sidebar">
      <StatusBadge />
    </aside>
  );
}

function StatusBadge() {
  // TODO: read the current theme from context instead of rendering a placeholder.
  return <span data-testid="status-badge">unknown</span>;
}

export default function App() {
  const [theme, setTheme] = useState<Theme>('light');
  const toggleTheme = () => setTheme((t) => (t === 'light' ? 'dark' : 'light'));

  return (
    <div>
      <Header theme={theme} onToggle={toggleTheme} />
      <Sidebar />
    </div>
  );
}
