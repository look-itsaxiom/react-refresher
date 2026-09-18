import { useState } from 'react';

function Drawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;

  return (
    <div className="drawer" role="dialog" aria-label="Quick settings">
      <button onClick={onClose}>Close</button>
      <label>
        Display name
        <input type="text" defaultValue="" />
      </label>
      <button>Save</button>
    </div>
  );
}

export default function App() {
  const [open, setOpen] = useState(false);

  return (
    <main>
      <button onClick={() => setOpen(true)}>Open settings</button>

      <div>
        <button>Other page action</button>
      </div>

      <Drawer open={open} onClose={() => setOpen(false)} />
    </main>
  );
}
