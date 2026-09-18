import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { addTodo, type Todo } from '@server/todos';

const TITLE_MAX = 40;

type State = {
  todos: Todo[];
  errors: { title?: string; owner?: string };
  values: { title: string; owner: string };
};

async function submit(prev: State, formData: FormData): Promise<State> {
  const title = String(formData.get('title') ?? '');
  const owner = String(formData.get('owner') ?? '');
  const errors: State['errors'] = {};

  if (title.length > TITLE_MAX) {
    errors.title = `Title must be ${TITLE_MAX} characters or fewer`;
  }
  if (!owner.trim()) {
    errors.owner = 'Owner is required';
  }
  if (Object.keys(errors).length > 0) {
    return { todos: prev.todos, errors, values: { title, owner } };
  }

  try {
    const todos = await addTodo(title);
    return { todos, errors: {}, values: { title: '', owner: '' } };
  } catch (e) {
    // @server/todos rejects a blank title after trimming — that's a title error, not a banner.
    return { todos: prev.todos, errors: { title: (e as Error).message }, values: { title, owner } };
  }
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return <button disabled={pending}>{pending ? 'Adding…' : 'Add'}</button>;
}

const initialState: State = { todos: [], errors: {}, values: { title: '', owner: '' } };

export default function App() {
  const [state, formAction] = useActionState(submit, initialState);

  return (
    <main>
      <form action={formAction}>
        <div>
          <label htmlFor="title">Title</label>
          <input
            id="title"
            name="title"
            defaultValue={state.values.title}
            aria-invalid={state.errors.title ? true : undefined}
            aria-describedby={state.errors.title ? 'title-error' : undefined}
          />
          {state.errors.title && (
            <p id="title-error" role="alert">
              {state.errors.title}
            </p>
          )}
        </div>
        <div>
          <label htmlFor="owner">Owner</label>
          <input
            id="owner"
            name="owner"
            defaultValue={state.values.owner}
            aria-invalid={state.errors.owner ? true : undefined}
            aria-describedby={state.errors.owner ? 'owner-error' : undefined}
          />
          {state.errors.owner && (
            <p id="owner-error" role="alert">
              {state.errors.owner}
            </p>
          )}
        </div>
        <SubmitButton />
      </form>
      <ul>
        {state.todos.map((t) => (
          <li key={t.id}>{t.title}</li>
        ))}
      </ul>
    </main>
  );
}
