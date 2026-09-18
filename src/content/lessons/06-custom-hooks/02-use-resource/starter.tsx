import { useEffect, useState } from 'react';
import { fetchUser } from '@server/users';
import { fetchPosts } from '@server/posts';

function UserCard() {
  const [user, setUser] = useState<{ id: number; name: string; bio: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchUser(1)
      .then((data) => {
        if (!cancelled) {
          setUser(data);
          setLoading(false);
        }
      })
      .catch(() => {
        // TODO: this swallows the error and leaves the component loading forever.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <p>Loading user…</p>;
  return <p data-testid="user-name">{user!.name}</p>;
}

function PostList() {
  const [posts, setPosts] = useState<{ id: number; title: string }[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchPosts().then(
      (data) => {
        if (!cancelled) {
          setPosts(data);
          setLoading(false);
        }
      },
      (err: Error) => {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

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
