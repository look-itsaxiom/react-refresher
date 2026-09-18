import { useState } from 'react';

type UserBadgeProps = {
  name: string;
  role?: string;
};

function UserBadge({ name, role = 'Member' }: UserBadgeProps) {
  return (
    <div className="badge">
      <strong>{name}</strong>
      <span> — {role}</span>
    </div>
  );
}

export default function App() {
  const [members] = useState([
    { name: 'Priya Shah', role: undefined },
    { name: 'Dan Ortiz', role: 'Admin' },
    { name: 'Lee Nguyen', role: undefined },
  ]);

  return (
    <main>
      <h1>Team roster</h1>
      <ul>
        {members.map((member) => (
          <li key={member.name}>
            <UserBadge name={member.name} role={member.role} />
          </li>
        ))}
      </ul>
    </main>
  );
}
