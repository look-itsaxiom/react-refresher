import { serverCall } from './core';

export type User = { id: number; name: string; bio: string };

const users: Record<number, User> = {
  1: { id: 1, name: 'Ada Lovelace', bio: 'Wrote the first algorithm intended for a machine.' },
  2: { id: 2, name: 'Grace Hopper', bio: 'Built the first compiler and popularized machine-independent languages.' },
};

export function fetchUser(id: number): Promise<User> {
  return serverCall(() => {
    const user = users[id];
    if (!user) throw new Error(`No user with id ${id}`);
    return user;
  });
}
