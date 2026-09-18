import type { Check } from '../../../types';

type Mod = {
  renderDeclarativeShadow: (
    tag: string,
    shadowHTML: string,
    lightHTML: string,
    options?: { mode?: 'open' | 'closed' },
  ) => string;
  hydrateDeclarativeShadow: (container: ParentNode) => number;
};

function getFns(mod: Record<string, unknown>): Mod {
  const renderDeclarativeShadow = mod.renderDeclarativeShadow;
  const hydrateDeclarativeShadow = mod.hydrateDeclarativeShadow;
  if (typeof renderDeclarativeShadow !== 'function' || typeof hydrateDeclarativeShadow !== 'function') {
    throw new Error('expected the module to export renderDeclarativeShadow and hydrateDeclarativeShadow');
  }
  return { renderDeclarativeShadow, hydrateDeclarativeShadow } as Mod;
}

export const checks: Check[] = [
  {
    name: 'renderDeclarativeShadow produces a <template shadowrootmode> wrapping the shadow HTML, followed by the light HTML',
    run: async ({ mod, expect }) => {
      const { renderDeclarativeShadow } = getFns(mod);
      const html = renderDeclarativeShadow('x-note', '<em>shadow</em>', '<span>light</span>');

      expect(html.startsWith('<x-note>'), 'expected the output to start with the opening tag').to.equal(true);
      expect(html.endsWith('</x-note>'), 'expected the output to end with the closing tag').to.equal(true);
      expect(html).to.include('<template shadowrootmode="open">');

      const templateIndex = html.indexOf('<template shadowrootmode="open">');
      const shadowIndex = html.indexOf('<em>shadow</em>');
      const templateCloseIndex = html.indexOf('</template>');
      const lightIndex = html.indexOf('<span>light</span>');

      expect(templateIndex).to.be.lessThan(shadowIndex);
      expect(shadowIndex).to.be.lessThan(templateCloseIndex);
      expect(templateCloseIndex).to.be.lessThan(lightIndex);
    },
  },
  {
    name: 'renderDeclarativeShadow respects options.mode = "closed"',
    run: async ({ mod, expect }) => {
      const { renderDeclarativeShadow } = getFns(mod);
      const html = renderDeclarativeShadow('x-note', '<em>x</em>', '', { mode: 'closed' });
      expect(html).to.include('<template shadowrootmode="closed">');
      expect(html).to.not.include('shadowrootmode="open"');
    },
  },
  {
    name: 'hydrateDeclarativeShadow attaches a real shadow root and moves the template content into it',
    run: async ({ mod, expect }) => {
      const { renderDeclarativeShadow, hydrateDeclarativeShadow } = getFns(mod);
      const container = document.createElement('div');
      container.innerHTML = renderDeclarativeShadow('div', '<p class="shadow-marker">inside</p>', '<span>outside</span>');
      document.body.appendChild(container);

      const host = container.querySelector('div')!;
      expect(host.shadowRoot, 'expected no shadow root before hydration (jsdom does not parse DSD)').to.equal(null);

      const created = hydrateDeclarativeShadow(container);
      expect(created).to.equal(1);
      expect(host.shadowRoot, 'expected a shadow root after hydration').to.not.equal(null);
      expect(host.shadowRoot!.querySelector('.shadow-marker')?.textContent).to.equal('inside');
      expect(host.querySelector('template'), 'expected the template to be removed after hydration').to.equal(null);
      expect(host.textContent).to.include('outside');

      document.body.removeChild(container);
    },
  },
  {
    name: 'hydrateDeclarativeShadow is a no-op the second time it runs on the same container',
    run: async ({ mod, expect }) => {
      const { renderDeclarativeShadow, hydrateDeclarativeShadow } = getFns(mod);
      const container = document.createElement('div');
      container.innerHTML = renderDeclarativeShadow('div', '<p>inside</p>', '');
      document.body.appendChild(container);

      const first = hydrateDeclarativeShadow(container);
      expect(first).to.equal(1);
      const host = container.querySelector('div')!;
      const rootAfterFirst = host.shadowRoot;

      const second = hydrateDeclarativeShadow(container);
      expect(second, 'expected the second hydration pass to create nothing').to.equal(0);
      expect(host.shadowRoot).to.equal(rootAfterFirst);

      document.body.removeChild(container);
    },
  },
];
