import type { Check } from '../../../types';

function uniqueSuffix(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

type CounterModule = { define: (suffix: string) => string };

function getButtons(el: Element): [HTMLButtonElement, HTMLButtonElement] {
  const buttons = Array.from(el.querySelectorAll('button'));
  const dec = buttons[0];
  const inc = buttons[1];
  if (!dec || !inc) throw new Error('expected exactly two buttons (decrement and increment)');
  return [dec, inc];
}

export const checks: Check[] = [
  {
    name: 'renders a decrement button, an <output>, and an increment button, and the value attribute reflects onto the property',
    run: ({ mod, expect }) => {
      const { define } = mod as unknown as CounterModule;
      const tag = define(uniqueSuffix());
      const el = document.createElement(tag) as HTMLElement & { value: number };
      document.body.append(el);
      el.setAttribute('value', '5');
      expect(el.value, 'setting the value attribute should update the value property').to.equal(5);
      const output = el.querySelector('output');
      expect(output, 'expected an <output> element').to.exist;
      expect(output!.textContent).to.equal('5');
      const buttons = el.querySelectorAll('button');
      expect(buttons.length, 'expected exactly two buttons (decrement and increment)').to.equal(2);
      el.remove();
    },
  },
  {
    name: 'the value property reflects back onto the value attribute',
    run: ({ mod, expect }) => {
      const { define } = mod as unknown as CounterModule;
      const tag = define(uniqueSuffix());
      const el = document.createElement(tag) as HTMLElement & { value: number };
      document.body.append(el);
      el.value = 7;
      expect(el.getAttribute('value'), 'setting the value property should update the value attribute').to.equal('7');
      el.remove();
    },
  },
  {
    name: 'clicking increment/decrement steps by the `step` attribute and dispatches x-change, but setting the property does not',
    run: async ({ mod, expect, user }) => {
      const { define } = mod as unknown as CounterModule;
      const tag = define(uniqueSuffix());
      const el = document.createElement(tag) as HTMLElement & { value: number };
      el.setAttribute('value', '4');
      el.setAttribute('step', '2');
      document.body.append(el);

      const events: number[] = [];
      el.addEventListener('x-change', (event) => {
        events.push((event as CustomEvent<{ value: number }>).detail.value);
      });

      const [dec, inc] = getButtons(el);
      await user.click(inc);
      expect(el.querySelector('output')!.textContent, 'increment should step by the `step` attribute').to.equal('6');
      expect(events, 'clicking increment should dispatch x-change with the new value').to.deep.equal([6]);

      await user.click(dec);
      expect(events, 'clicking decrement should dispatch x-change with the new value').to.deep.equal([6, 4]);

      el.value = 10;
      expect(events, 'setting the value property should not dispatch x-change').to.deep.equal([6, 4]);
      el.remove();
    },
  },
  {
    name: 'clamps the value between min and max',
    run: async ({ mod, expect, user }) => {
      const { define } = mod as unknown as CounterModule;
      const tag = define(uniqueSuffix());
      const el = document.createElement(tag);
      el.setAttribute('value', '9');
      el.setAttribute('min', '0');
      el.setAttribute('max', '10');
      document.body.append(el);

      const [, inc] = getButtons(el);
      await user.click(inc);
      await user.click(inc);
      await user.click(inc);
      expect(el.querySelector('output')!.textContent, 'value should clamp at max instead of exceeding it').to.equal('10');
      el.remove();
    },
  },
  {
    name: 'a disabled x-counter disables both buttons',
    run: ({ mod, expect }) => {
      const { define } = mod as unknown as CounterModule;
      const tag = define(uniqueSuffix());
      const el = document.createElement(tag);
      el.setAttribute('disabled', '');
      document.body.append(el);
      const [dec, inc] = getButtons(el);
      expect(dec.disabled, 'decrement button should be disabled').to.equal(true);
      expect(inc.disabled, 'increment button should be disabled').to.equal(true);
      el.remove();
    },
  },
];
