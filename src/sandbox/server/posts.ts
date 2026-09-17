import { onReset, serverCall } from './core';

export type Post = { id: number; title: string };

const posts: Post[] = [
  { id: 1, title: 'Why state is a snapshot' },
  { id: 2, title: 'Transitions keep the UI responsive' },
  { id: 3, title: 'Suspense is a boundary, not a spinner' },
];

let cached: Promise<Post[]> | null = null;
onReset(() => {
  cached = null;
});

/**
 * Returns a cached promise so `use(fetchPosts())` reads the same promise on every render.
 * Creating a new promise during each render would suspend forever.
 */
export function fetchPosts(): Promise<Post[]> {
  cached ??= serverCall(() => [...posts]);
  return cached;
}
