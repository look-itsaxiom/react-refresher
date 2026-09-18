import { createContext, useContext, type ReactNode } from 'react';

type Theme = 'light' | 'dark';

const ThemeContext = createContext<Theme>('light');

function ThemeProvider({ theme, children }: { theme: Theme; children: ReactNode }) {
  return <ThemeContext value={theme}>{children}</ThemeContext>;
}

function ThemedBanner() {
  const theme = useContext(ThemeContext);
  return <p>Current theme: {theme}</p>;
}

function ThemeStatus() {
  const theme = useContext(ThemeContext);
  return <p>{theme === 'dark' ? 'Dark mode is on' : 'Light mode is on'}</p>;
}

export default function App() {
  return (
    <ThemeProvider theme="dark">
      <ThemedBanner />
      <ThemeStatus />
    </ThemeProvider>
  );
}
