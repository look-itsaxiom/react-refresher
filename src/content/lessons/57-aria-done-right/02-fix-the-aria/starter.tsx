import { useState } from 'react';

export default function App() {
  const [open, setOpen] = useState(false);
  const [muted, setMuted] = useState(false);

  return (
    <div className="notifications">
      <div role="button" className="toggle" onClick={() => setOpen((o) => !o)}>
        Notifications
      </div>

      {open && (
        <div className="panel">
          <div className="row">
            <div aria-label="Mute notifications" className="label">
              Mute
            </div>
            <div
              role="button"
              aria-checked={muted}
              className={`switch ${muted ? 'on' : ''}`}
              onClick={() => setMuted((m) => !m)}
            >
              {muted ? 'On' : 'Off'}
            </div>
          </div>

          <button role="button" className="dismiss" onClick={() => setOpen(false)}>
            Dismiss all
          </button>
        </div>
      )}
    </div>
  );
}
