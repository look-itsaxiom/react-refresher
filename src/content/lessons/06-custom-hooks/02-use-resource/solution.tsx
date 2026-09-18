import { useEffect, useState } from 'react';
import { fetchUser } from '@server/users';
import { fetchPosts } from '@server/posts';

type Resource<T> = { data: T | null; loading: boolean; error: string | null };

function useResource<T>(loader: () => Promise<T>): Resource<T> {
  const [state, setState] = useState<Resource<T>>({ data: null, loading: true, error: null });

  useEffect(() => {
    let cancelled = false;
    loader().then(
      (data) => {
        if (!cancelled) setState({ data, loading: false, error: null });
      },
      (err: Error) => {
        if (!cancelled) setState({ data: null, loading: false, error: err.message });
      },
    );
    return () => {
      cancelled = true;
    };
    // Runs once per mount; each call site owns its own loader and its own state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return state;
}

function UserCard() {
  const { data: user, loading, error } = useResource(() => fetchUser(1));

  if (loading) return <p>Loading user…</p>;
  if (error) return <p role="alert">Error: {error}</p>;
  return <p data-testid="user-name">{user!.name}</p>;
}

function PostList() {
  const { data: posts, loading, error } = useResource(() => fetchPosts());

  if (loading) return <p>Loading posts…</p>;
  if (error) return <p role="alert">Error: {error}</p>;
  return (
    <ul>
      {posts!.map((post) => (
        <li key={post.id}>{post.title}</li>
      ))}
    </ul>
  );
}

export default function App() {
  return (
    <div>
      <UserCard />
      <PostList />
    </div>
  );
}
