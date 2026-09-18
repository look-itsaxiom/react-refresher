import type { Check } from '../../../types';

type TemplateResult = { strings: TemplateStringsArray; values: unknown[] };
type Mod = {
  html: (strings: TemplateStringsArray, ...values: unknown[]) => TemplateResult;
  render: (template: TemplateResult, container: Element) => void;
};

export const checks: Check[] = [
  {
    name: 're-rendering the same template shape reuses existing elements instead of rebuilding them',
    run: async (ctx) => {
      const { mod, expect } = ctx;
      const { html, render } = mod as unknown as Mod;
      const div = document.createElement('div');
      const view = (name: string) => html`<p>Hi ${name}</p>`;

      render(view('Ada'), div);
      const p1 = div.querySelector('p');
      expect(p1!.textContent).to.equal('Hi Ada');

      render(view('Grace'), div);
      const p2 = div.querySelector('p');
      expect(p2!.textContent, 'the text updated').to.equal('Hi Grace');
      expect(p1, 'the same <p> element was reused, not rebuilt from a fresh innerHTML parse').to.equal(p2);
    },
  },
  {
    name: 'escapes a dynamic text value instead of parsing it as markup',
    run: async (ctx) => {
      const { mod, expect } = ctx;
      const { html, render } = mod as unknown as Mod;
      const div = document.createElement('div');
      const payload = '<img src=x onerror="window.__pwned = true">';
      render(html`<p>${payload}</p>`, div);
      expect(div.querySelector('img'), 'no element was created from the interpolated string').to.equal(null);
      expect(div.querySelector('p')!.textContent).to.equal(payload);
    },
  },
  {
    name: 'attr=, .prop=, and @event= bind to the right thing',
    run: async (ctx) => {
      const { mod, expect } = ctx;
      const { html, render } = mod as unknown as Mod;
      const div = document.createElement('div');
      let clicks = 0;
      const onClick = () => {
        clicks++;
      };
      render(
        html`<button title="${'go'}" .disabled="${false}" @click="${onClick}">Go</button>`,
        div,
      );
      const button = div.querySelector('button')! as HTMLButtonElement;
      expect(button.getAttribute('title'), 'attr= sets a plain attribute').to.equal('go');
      expect(button.disabled, '.prop= assigns a real property, not the string "false"').to.equal(false);
      button.dispatchEvent(new Event('click'));
      expect(clicks, '@event= actually attaches a listener').to.equal(1);
    },
  },
  {
    name: 'updating a value in place swaps the event listener and updates the attribute without a full rebuild',
    run: async (ctx) => {
      const { mod, expect } = ctx;
      const { html, render } = mod as unknown as Mod;
      const div = document.createElement('div');
      const events: string[] = [];
      const view = (label: string, onClick: () => void) =>
        html`<button title="${label}" @click="${onClick}">Go</button>`;

      render(view('first', () => events.push('old')), div);
      const button1 = div.querySelector('button');

      render(view('second', () => events.push('new')), div);
      const button2 = div.querySelector('button');
      expect(button1, 'the button element was reused across the update').to.equal(button2);
      expect(button2!.getAttribute('title'), 'the attribute updated in place').to.equal('second');

      button2!.dispatchEvent(new Event('click'));
      expect(events, 'only the latest handler fired — the old one was removed, not stacked').to.deep.equal(['new']);
    },
  },
  {
    name: 'renders a keyless array of item templates as a list, and re-renders it when the array changes',
    run: async (ctx) => {
      const { mod, expect } = ctx;
      const { html, render } = mod as unknown as Mod;
      const div = document.createElement('div');
      const view = (items: string[]) => html`<ul>${items.map((item) => html`<li>${item}</li>`)}</ul>`;

      render(view(['a', 'b', 'c']), div);
      let lis = div.querySelectorAll('li');
      expect(lis.length).to.equal(3);
      expect(Array.from(lis).map((li) => li.textContent)).to.deep.equal(['a', 'b', 'c']);

      render(view(['x', 'y']), div);
      lis = div.querySelectorAll('li');
      expect(lis.length, 'the list shrank to match the new array').to.equal(2);
      expect(Array.from(lis).map((li) => li.textContent)).to.deep.equal(['x', 'y']);
    },
  },
];
