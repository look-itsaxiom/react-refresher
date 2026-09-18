import { useEffect, useRef, useState, type RefObject } from 'react';

const FOCUSABLE_SELECTOR = 'button, input, [href], select, textarea, [tabindex]';

function Drawer({
  open,
  onClose,
  openerRef,
}: {
  open: boolean;
  onClose: () => void;
  openerRef: RefObject<HTMLButtonElement | null>;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const container = containerRef.current;
    if (!container) return;

    const focusables = () => Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));

    focusables()[0]?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;

      const items = focusables();
      if (items.length === 0) return;
      const first = items[0]!;
      const last = items[items.length - 1]!;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    container.addEventListener('keydown', onKeyDown);
    return () => {
      container.removeEventListener('keydown', onKeyDown);
      openerRef.current?.focus();
    };
  }, [open, onClose, openerRef]);

  if (!open) return null;

  return (
    <div className="drawer" role="dialog" aria-label="Quick settings" ref={containerRef}>
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
  const openerRef = useRef<HTMLButtonElement>(null);

  return (
    <main>
      <button ref={openerRef} onClick={() => setOpen(true)}>
        Open settings
      </button>

      <div aria-hidden={open || undefined} inert={open}>
        <button>Other page action</button>
      </div>

      <Drawer open={open} onClose={() => setOpen(false)} openerRef={openerRef} />
    </main>
  );
}
