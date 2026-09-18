import type { Check } from '../../../types';

type ActionState = { todos: Array<{ id: number; title: string }>; errors: { auth?: string; title?: string } };
type Mod = {
  createTodoAction: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  setSession: (s: { userId: string } | null) => void;
};

function formWith(title: string): FormData {
  const fd = new FormData();
  fd.set('title', title);
  return fd;
}

export const checks: Check[] = [
  {
    name: 'rejects an unauthenticated call with an error, and adds nothing',
    run: async ({ mod, expect, server }) => {
      server.setLatency(10);
      const { createTodoAction, setSession } = mod as unknown as Mod;
      setSession(null);
      const result = await createTodoAction({ todos: [], errors: {} }, formWith('Buy milk'));
      expect(result.errors.auth, 'should return an auth error when there is no session').to.be.a('string');
      expect(result.todos.length, 'should not add a todo').to.equal(0);
    },
  },
  {
    name: 'adds the todo when a session is present',
    run: async ({ mod, expect, server }) => {
      server.setLatency(10);
      const { createTodoAction } = mod as unknown as Mod;
      const result = await createTodoAction({ todos: [], errors: {} }, formWith('Buy milk'));
      expect(result.todos.some((t) => t.title === 'Buy milk'), 'the todo should be added').to.equal(true);
    },
  },
  {
    name: 'a blank title yields a field error and adds nothing',
    run: async ({ mod, expect, server }) => {
      server.setLatency(10);
      const { createTodoAction } = mod as unknown as Mod;
      const result = await createTodoAction({ todos: [], errors: {} }, formWith('   '));
      expect(result.errors.title, 'should return a title error').to.match(/required/i);
      expect(result.todos.length, 'should not add a todo').to.equal(0);
    },
  },
  {
    name: 'never throws when the underlying server call fails -- it returns a typed error instead',
    run: async ({ mod, expect, server }) => {
      server.setLatency(10);
      server.failNext('Server exploded');
      const { createTodoAction } = mod as unknown as Mod;
      let threw = false;
      let result: ActionState | undefined;
      try {
        result = await createTodoAction({ todos: [], errors: {} }, formWith('Buy milk'));
      } catch {
        threw = true;
      }
      expect(threw, 'createTodoAction should never throw to its caller').to.equal(false);
      expect(result?.errors.auth ?? result?.errors.title, 'the failure should be reported in the returned state').to.be.a('string');
    },
  },
  {
    name: 'wired through useActionState: submitting the form adds a todo to the rendered list',
    run: async ({ render, screen, user, server, Component }) => {
      server.setLatency(10);
      render(<Component />);
      await user.type(screen.getByLabelText('Title'), 'Walk the dog');
      await user.click(screen.getByRole('button', { name: 'Add' }));
      await screen.findByText('Walk the dog', { selector: 'li' }, { timeout: 1000 });
    },
  },
];
