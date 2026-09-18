import { useId, useState } from 'react';

export default function App() {
  const [open, setOpen] = useState(false);
  const [muted, setMuted] = useState(false);
  const panelId = useId();

  return (
    <div className="notifications">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        className="toggle"
        onClick={() => setOpen((o) => !o)}
      >
        Notifications
      </button>

      {open && (
        <div id={panelId} role="region" aria-label="Notifications" className="panel">
          <div className="row">
            <span id={`${panelId}-mute-label`} className="label">
              Mute
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={muted}
              aria-labelledby={`${panelId}-mute-label`}
              className={`switch ${muted ? 'on' : ''}`}
              onClick={() => setMuted((m) => !m)}
            >
              {muted ? 'On' : 'Off'}
            </button>
          </div>

          <button type="button" className="dismiss" onClick={() => setOpen(false)}>
            Dismiss all
          </button>
        </div>
      )}
    </div>
  );
}
