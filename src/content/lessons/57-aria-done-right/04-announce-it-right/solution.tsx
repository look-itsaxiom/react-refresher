import { useState } from 'react';
import { addTodo } from '@server/todos';

export default function App() {
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  async function handleSave() {
    setError('');
    try {
      await addTodo(title);
      setStatus(`Saved "${title}"`);
      setTitle('');
    } catch (e) {
      setStatus('');
      setError((e as Error).message);
    }
  }

  return (
    <div>
      <label htmlFor="title">Title</label>
      <input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
      <button onClick={handleSave}>Save</button>

      <div role="status">{status}</div>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
