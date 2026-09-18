import { useState } from 'react';

const TOOLS = ['Bold', 'Italic', 'Underline', 'Strikethrough', 'Code'];

function FormattingToolbar() {
  const [pressed, setPressed] = useState<Record<string, boolean>>({});

  return (
    <div role="toolbar" aria-label="Formatting">
      {TOOLS.map((tool) => (
        <button
          key={tool}
          type="button"
          tabIndex={0}
          aria-pressed={Boolean(pressed[tool])}
          onClick={() => setPressed((prev) => ({ ...prev, [tool]: !prev[tool] }))}
        >
          {tool}
        </button>
      ))}
    </div>
  );
}

export default function App() {
  return (
    <main>
      <FormattingToolbar />
      <label>
        Document title
        <input type="text" />
      </label>
    </main>
  );
}
