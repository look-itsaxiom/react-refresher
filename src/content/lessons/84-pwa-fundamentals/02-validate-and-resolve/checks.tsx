import type { Check } from '../../../types';

type ValidateResult = { errors: string[]; warnings: string[]; installable: boolean };

export const checks: Check[] = [
  {
    name: 'a fully filled-out manifest has no errors, no warnings, and is installable',
    run: async ({ mod, expect }) => {
      const validateManifest = mod.validateManifest as (manifest: unknown) => ValidateResult;
      const result = validateManifest({
        name: 'Kanbanly',
        short_name: 'Kanbanly',
        id: '/?homescreen=1',
        start_url: '/?source=pwa',
        scope: '/',
        display: 'standalone',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        screenshots: [{ src: '/s1.png', sizes: '1280x800', form_factor: 'wide' }],
        theme_color: '#0b1220',
      });
      expect(result.errors).to.deep.equal([]);
      expect(result.warnings).to.deep.equal([]);
      expect(result.installable).to.equal(true);
    },
  },
  {
    name: 'a manifest with no icons array fails installability with an icon-related error',
    run: async ({ mod, expect }) => {
      const validateManifest = mod.validateManifest as (manifest: unknown) => ValidateResult;
      const result = validateManifest({ name: 'No Icons', start_url: '/', scope: '/', display: 'standalone' });
      expect(result.installable).to.equal(false);
      expect(result.errors.some((e) => /icon/i.test(e))).to.equal(true);
    },
  },
  {
    name: 'an invalid display is rescued by a supported display_override entry, and stays installable',
    run: async ({ mod, expect }) => {
      const validateManifest = mod.validateManifest as (manifest: unknown) => ValidateResult;
      const result = validateManifest({
        name: 'Kiosk App',
        start_url: '/',
        scope: '/',
        display: 'kiosk',
        display_override: ['standalone'],
        icons: [{ src: '/icon.png', sizes: '512x512' }],
      });
      expect(result.errors.some((e) => /display/i.test(e))).to.equal(false);
      expect(result.installable).to.equal(true);
    },
  },
  {
    name: 'a start_url outside scope fails installability with a scope-related error, even with valid icons and display',
    run: async ({ mod, expect }) => {
      const validateManifest = mod.validateManifest as (manifest: unknown) => ValidateResult;
      const result = validateManifest({
        name: 'Scoped',
        start_url: '/other/page',
        scope: '/app/',
        display: 'standalone',
        icons: [{ src: '/icon.png', sizes: '512x512' }],
      });
      expect(result.installable).to.equal(false);
      expect(result.errors.some((e) => /scope/i.test(e))).to.equal(true);
    },
  },
  {
    name: 'a manifest valid on required fields but missing every optional field produces exactly the 5 documented warnings and stays installable',
    run: async ({ mod, expect }) => {
      const validateManifest = mod.validateManifest as (manifest: unknown) => ValidateResult;
      const result = validateManifest({
        name: 'Warnings Only',
        start_url: '/app/start',
        scope: '/app/',
        display: 'standalone',
        icons: [{ src: '/icon-192.png', sizes: '192x192' }],
        theme_color: 'blue',
      });
      expect(result.errors).to.deep.equal([]);
      expect(result.installable).to.equal(true);
      expect(result.warnings.length).to.equal(5);
      expect(result.warnings.some((w) => /\bid\b/i.test(w))).to.equal(true);
      expect(result.warnings.some((w) => /512/.test(w))).to.equal(true);
      expect(result.warnings.some((w) => /maskable/i.test(w))).to.equal(true);
      expect(result.warnings.some((w) => /screenshot/i.test(w))).to.equal(true);
      expect(result.warnings.some((w) => /theme_color|theme color|hex/i.test(w))).to.equal(true);
    },
  },
  {
    name: 'resolveDisplayMode prefers a supported display_override entry over the primary display',
    run: async ({ mod, expect }) => {
      const resolveDisplayMode = mod.resolveDisplayMode as (
        manifest: { display?: string; display_override?: string[] },
        supported: string[],
      ) => string;
      const mode = resolveDisplayMode(
        { display: 'browser', display_override: ['window-controls-overlay', 'standalone'] },
        ['standalone', 'browser'],
      );
      expect(mode).to.equal('standalone');
    },
  },
  {
    name: 'resolveDisplayMode falls back along the chain from the display position when display_override does not match',
    run: async ({ mod, expect }) => {
      const resolveDisplayMode = mod.resolveDisplayMode as (
        manifest: { display?: string; display_override?: string[] },
        supported: string[],
      ) => string;
      const mode = resolveDisplayMode({ display: 'standalone' }, ['minimal-ui', 'browser']);
      expect(mode).to.equal('minimal-ui');
    },
  },
  {
    name: 'resolveDisplayMode returns browser when nothing else in the chain is supported',
    run: async ({ mod, expect }) => {
      const resolveDisplayMode = mod.resolveDisplayMode as (
        manifest: { display?: string; display_override?: string[] },
        supported: string[],
      ) => string;
      const mode = resolveDisplayMode({ display: 'fullscreen' }, []);
      expect(mode).to.equal('browser');
    },
  },
  {
    name: 'resolveDisplayMode with a missing display starts the walk at browser, ignoring earlier supported modes',
    run: async ({ mod, expect }) => {
      const resolveDisplayMode = mod.resolveDisplayMode as (
        manifest: { display?: string; display_override?: string[] },
        supported: string[],
      ) => string;
      const mode = resolveDisplayMode({}, ['standalone', 'fullscreen']);
      expect(mode).to.equal('browser');
    },
  },
  {
    name: 'the rendered App reflects the fixture manifest\'s installability and warning count',
    run: async ({ render, screen, expect, act, Component }) => {
      await act(async () => {
        render(<Component />);
      });
      expect(screen.getByTestId('installable').textContent).to.include('Yes');
      expect(screen.getByTestId('error-count').textContent).to.include('0');
      expect(screen.getByTestId('resolved-mode').textContent).to.include('minimal-ui');
    },
  },
];
