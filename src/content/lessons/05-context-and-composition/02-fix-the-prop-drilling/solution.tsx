import { createContext, use, useMemo, useState } from 'react';

type Theme = 'light' | 'dark';
type ThemeContextValue = { theme: Theme; toggleTheme: () => void };

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'light',
  toggleTheme: () => {},
});

function Header() {
  return (
    <header data-testid="header">
      <ThemeToggle />
    </header>
  );
}

function ThemeToggle() {
  const { theme, toggleTheme } = use(ThemeContext);
  return <button onClick={toggleTheme}>{theme === 'light' ? 'Switch to dark' : 'Switch to light'}</button>;
}

function Sidebar() {
  return (
    <aside data-testid="sidebar">
      <StatusBadge />
    </aside>
  );
}

function StatusBadge() {
  const { theme } = use(ThemeContext);
  return <span data-testid="status-badge">{theme}</span>;
}

export default function App() {
  const [theme, setTheme] = useState<Theme>('light');
  const toggleTheme = () => setTheme((t) => (t === 'light' ? 'dark' : 'light'));
  const value = useMemo(() => ({ theme, toggleTheme }), [theme]);

  return (
    <ThemeContext value={value}>
      <div>
        <Header />
        <Sidebar />
      </div>
    </ThemeContext>
  );
}
