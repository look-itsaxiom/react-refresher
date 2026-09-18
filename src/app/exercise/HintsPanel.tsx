import { useState } from 'react';
import { Markdown } from '../components/Markdown';
import { Button } from '../components/Button';

export function HintsPanel({ hints }: { hints: string[] }) {
  const [revealed, setRevealed] = useState(0);
  if (hints.length === 0) return null;
  return (
    <div className="mt-6 border-t border-border pt-4">
      <h3 className="text-sm font-semibold">Hints</h3>
      <ol className="mt-2 space-y-2">
        {hints.slice(0, revealed).map((h, i) => (
          <li key={i} className="rounded-md border border-border bg-surface-2 p-3 text-sm"><Markdown source={h} /></li>
        ))}
      </ol>
      {revealed < hints.length && (
        <Button size="sm" variant="ghost" className="mt-2" onClick={() => setRevealed((n) => n + 1)}>
          {revealed === 0 ? 'Show a hint' : `Show hint ${revealed + 1} of ${hints.length}`}
        </Button>
      )}
    </div>
  );
}
