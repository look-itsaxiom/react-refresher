import { use } from 'react';
import { fetchUser } from '@server/users';

// Created once, outside render, so every render reads the same promise.
const userPromise = fetchUser(1);

function UserProfile() {
  const user = use(userPromise);
  return (
    <section>
      <h2>{user.name}</h2>
      <p>{user.bio}</p>
    </section>
  );
}

export default function App() {
  return (
    <main>
      <h1>Profile</h1>
      <UserProfile />
    </main>
  );
}
