import { Component, type ReactNode } from 'react';

type Theme = 'light' | 'dark';

class ThemeProvider extends Component<{ theme: Theme; children: ReactNode }> {
  // Legacy context — React 19 never calls this.
  static childContextTypes = {
    theme: () => null,
  };

  getChildContext() {
    return { theme: this.props.theme };
  }

  render() {
    return this.props.children;
  }
}

class ThemedBanner extends Component {
  // Legacy context — React 19 never populates this.context from it.
  static contextTypes = {
    theme: () => null,
  };

  render() {
    const theme = (this.context as { theme?: Theme }).theme ?? 'light';
    return <p>Current theme: {theme}</p>;
  }
}

class ThemeStatus extends Component {
  static contextTypes = {
    theme: () => null,
  };

  render() {
    const theme = (this.context as { theme?: Theme }).theme ?? 'light';
    return <p>{theme === 'dark' ? 'Dark mode is on' : 'Light mode is on'}</p>;
  }
}

export default function App() {
  return (
    <ThemeProvider theme="dark">
      <ThemedBanner />
      <ThemeStatus />
    </ThemeProvider>
  );
}
