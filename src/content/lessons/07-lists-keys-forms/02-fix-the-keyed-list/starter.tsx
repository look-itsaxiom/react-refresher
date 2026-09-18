import { useState } from 'react';

type PackingItem = { id: number; label: string };

let nextId = 4;

const initialItems: PackingItem[] = [
  { id: 1, label: 'Passport' },
  { id: 2, label: 'Charger' },
  { id: 3, label: 'Sunscreen' },
];

function Row({ item, onRemove }: { item: PackingItem; onRemove: () => void }) {
  const [note, setNote] = useState('');
  return (
    <li>
      <span>{item.label}</span>
      <input
        aria-label={`Note for ${item.label}`}
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      <button onClick={onRemove}>Remove {item.label}</button>
    </li>
  );
}

export default function App() {
  const [items, setItems] = useState(initialItems);

  function removeAt(index: number) {
    setItems((current) => current.filter((_, i) => i !== index));
  }

  function addItem() {
    setItems((current) => [...current, { id: nextId, label: `Item ${nextId++}` }]);
  }

  return (
    <div>
      <ul>
        {items.map((item, index) => (
          <Row key={index} item={item} onRemove={() => removeAt(index)} />
        ))}
      </ul>
      <button onClick={addItem}>Add item</button>
    </div>
  );
}
