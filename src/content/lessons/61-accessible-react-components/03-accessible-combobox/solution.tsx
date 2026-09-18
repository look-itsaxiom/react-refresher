import { useId, useMemo, useState } from 'react';

const FRUITS = [
  'Apple',
  'Apricot',
  'Avocado',
  'Banana',
  'Blackberry',
  'Blueberry',
  'Cherry',
  'Cranberry',
  'Date',
  'Dragonfruit',
  'Elderberry',
  'Fig',
  'Grape',
  'Grapefruit',
  'Guava',
];

export default function App() {
  const inputId = useId();
  const listboxId = useId();
  const optionIdPrefix = useId();

  const [value, setValue] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const filtered = useMemo(
    () =>
      value.trim() === ''
        ? []
        : FRUITS.filter((fruit) => fruit.toLowerCase().includes(value.toLowerCase())),
    [value],
  );

  const activeId =
    activeIndex >= 0 && activeIndex < filtered.length ? `${optionIdPrefix}-${activeIndex}` : undefined;

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const next = event.target.value;
    setValue(next);
    setOpen(next.trim() !== '');
    setActiveIndex(-1);
  }

  function selectIndex(index: number) {
    const fruit = filtered[index];
    if (!fruit) return;
    setValue(fruit);
    setOpen(false);
    setActiveIndex(-1);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || filtered.length === 0) {
      if (event.key === 'ArrowDown' && filtered.length > 0) {
        event.preventDefault();
        setOpen(true);
        setActiveIndex(0);
      }
      return;
    }

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setActiveIndex((current) => Math.min(current + 1, filtered.length - 1));
        break;
      case 'ArrowUp':
        event.preventDefault();
        setActiveIndex((current) => Math.max(current - 1, 0));
        break;
      case 'Home':
        event.preventDefault();
        setActiveIndex(0);
        break;
      case 'End':
        event.preventDefault();
        setActiveIndex(filtered.length - 1);
        break;
      case 'Enter':
        if (activeIndex >= 0) {
          event.preventDefault();
          selectIndex(activeIndex);
        }
        break;
      case 'Escape':
        event.preventDefault();
        setOpen(false);
        setActiveIndex(-1);
        break;
      default:
        break;
    }
  }

  return (
    <main>
      <label htmlFor={inputId}>Fruit</label>
      <input
        id={inputId}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={activeId}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
      />
      <div role="status">{open ? `${filtered.length} results` : ''}</div>
      {open && filtered.length > 0 && (
        <ul id={listboxId} role="listbox">
          {filtered.map((fruit, index) => (
            <li
              key={fruit}
              id={`${optionIdPrefix}-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              onClick={() => selectIndex(index)}
            >
              {fruit}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
