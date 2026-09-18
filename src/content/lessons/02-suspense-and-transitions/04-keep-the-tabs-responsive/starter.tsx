import { Suspense, use, useState } from 'react';
import { fetchPosts } from '@server/posts';

type Tab = 'home' | 'posts';

function Home() {
  return <p>Welcome home. Pick a tab.</p>;
}

function Posts() {
  // fetchPosts() returns a cached promise, so this is safe to call during render.
  const posts = use(fetchPosts());
  return (
    <ul>
      {posts.map((p) => (
        <li key={p.id}>{p.title}</li>
      ))}
    </ul>
  );
}

export default function App() {
  const [tab, setTab] = useState<Tab>('home');

  function select(next: Tab) {
    setTab(next);
  }

  return (
    <main>
      <nav data-pending="false">
        <button role="tab" aria-selected={tab === 'home'} onClick={() => select('home')}>
          Home
        </button>
        <button role="tab" aria-selected={tab === 'posts'} onClick={() => select('posts')}>
          Posts
        </button>
      </nav>
      <Suspense fallback={<p>Loading…</p>}>
        {tab === 'home' ? <Home /> : <Posts />}
      </Suspense>
    </main>
  );
}
