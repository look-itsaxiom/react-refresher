import { useState } from 'react';
import { addTodo } from '@server/todos';

export default function App() {
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  async function handleSave() {
    setError('');
    setStatus('');
    try {
      await addTodo(title);
      setStatus(`Saved "${title}"`);
      setTitle('');
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div>
      <label htmlFor="title">Title</label>
      <input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
      <button onClick={handleSave}>Save</button>

      {status && <div aria-live="assertive">{status}</div>}
      {error && <p>{error}</p>}
    </div>
  );
}
