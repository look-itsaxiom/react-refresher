import { useState } from 'react';

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
  const [value, setValue] = useState('');
  const [open, setOpen] = useState(false);

  const filtered =
    value.trim() === ''
      ? []
      : FRUITS.filter((fruit) => fruit.toLowerCase().includes(value.toLowerCase()));

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const next = event.target.value;
    setValue(next);
    setOpen(next.trim() !== '');
  }

  function handleSelect(fruit: string) {
    setValue(fruit);
    setOpen(false);
  }

  return (
    <main>
      <label htmlFor="fruit-input">Fruit</label>
      <input id="fruit-input" type="text" value={value} onChange={handleChange} />
      {open && filtered.length > 0 && (
        <ul>
          {filtered.map((fruit) => (
            <li key={fruit} onClick={() => handleSelect(fruit)}>
              {fruit}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
