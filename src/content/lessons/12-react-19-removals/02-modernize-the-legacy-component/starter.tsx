import { useState } from 'react';

type UserBadgeProps = {
  name: string;
  role?: string;
};

function UserBadge({ name, role }: UserBadgeProps) {
  return (
    <div className="badge">
      <strong>{name}</strong>
      <span> — {role}</span>
    </div>
  );
}

// Legacy validation — nothing in React 19 calls this anymore.
UserBadge.propTypes = {
  name: (props: Record<string, unknown>, propName: string) =>
    typeof props[propName] === 'string' ? null : new Error('name must be a string'),
};
// Legacy default — nothing in React 19 reads this on a function component anymore.
UserBadge.defaultProps = {
  role: 'Member',
};

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
