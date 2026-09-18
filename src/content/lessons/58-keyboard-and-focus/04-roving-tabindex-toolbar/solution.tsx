import { useRef, useState } from 'react';

const TOOLS = ['Bold', 'Italic', 'Underline', 'Strikethrough', 'Code'];

function FormattingToolbar() {
  const [pressed, setPressed] = useState<Record<string, boolean>>({});
  const [activeIndex, setActiveIndex] = useState(0);
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  function moveTo(index: number) {
    const next = (index + TOOLS.length) % TOOLS.length;
    setActiveIndex(next);
    buttonRefs.current[next]?.focus();
  }

  function onKeyDown(event: React.KeyboardEvent) {
    switch (event.key) {
      case 'ArrowRight':
        event.preventDefault();
        moveTo(activeIndex + 1);
        break;
      case 'ArrowLeft':
        event.preventDefault();
        moveTo(activeIndex - 1);
        break;
      case 'Home':
        event.preventDefault();
        moveTo(0);
        break;
      case 'End':
        event.preventDefault();
        moveTo(TOOLS.length - 1);
        break;
      default:
        break;
    }
  }

  return (
    <div role="toolbar" aria-label="Formatting" onKeyDown={onKeyDown}>
      {TOOLS.map((tool, index) => (
        <button
          key={tool}
          ref={(node) => {
            buttonRefs.current[index] = node;
          }}
          type="button"
          tabIndex={index === activeIndex ? 0 : -1}
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
