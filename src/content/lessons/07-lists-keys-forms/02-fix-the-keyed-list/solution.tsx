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
    <li data-id={item.id}>
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

  function removeItem(id: number) {
    // Filtering by id, not by index, so nothing shifts identity out from under a row.
    setItems((current) => current.filter((item) => item.id !== id));
  }

  function addItem() {
    setItems((current) => [...current, { id: nextId, label: `Item ${nextId++}` }]);
  }

  return (
    <div>
      <ul>
        {items.map((item) => (
          // Keying by the item's own id, not its position, is what keeps this row's
          // state (and DOM node) attached to this item after the list reshapes.
          <Row key={item.id} item={item} onRemove={() => removeItem(item.id)} />
        ))}
      </ul>
      <button onClick={addItem}>Add item</button>
    </div>
  );
}
