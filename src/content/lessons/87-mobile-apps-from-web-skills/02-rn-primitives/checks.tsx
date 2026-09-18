import type { ReactNode } from 'react';
import { cleanup } from '@testing-library/react';
import type { Check } from '../../../types';

type PlatformOS = 'ios' | 'android' | 'web';
type Style = Record<string, unknown> | false | null | undefined;
type PressState = { pressed: boolean };

type Mod = {
  flattenStyle: (style: Style | Style[]) => Record<string, unknown>;
  StyleSheet: { create: <T>(styles: T) => T };
  PlatformProvider: (props: { os: PlatformOS; children: ReactNode }) => React.JSX.Element;
  usePlatform: () => { OS: PlatformOS; select: <T>(spec: { ios?: T; android?: T; web?: T; default?: T }) => T | undefined };
  View: (props: { style?: Style | Style[]; children?: ReactNode; [key: string]: unknown }) => React.JSX.Element;
  Text: (props: { style?: Style | Style[]; children?: ReactNode; [key: string]: unknown }) => React.JSX.Element;
  Pressable: (props: {
    style?: Style | Style[] | ((state: PressState) => Style | Style[]);
    onPress?: () => void;
    children?: ReactNode | ((state: PressState) => ReactNode);
    [key: string]: unknown;
  }) => React.JSX.Element;
};

export const checks: Check[] = [
  {
    name: 'View applies flex/column/box-sizing defaults, and flattens a style array left-to-right while skipping falsy entries',
    run: async (ctx) => {
      const { mod, render, screen, expect } = ctx;
      const { View, Text } = mod as unknown as Mod;

      render(
        <View
          data-testid="box"
          style={[{ padding: '4px', color: 'red' }, false, { color: 'blue' }, null, undefined, { color: 'blue', margin: '2px' }]}
        >
          <Text>hi</Text>
        </View>,
      );

      const box = screen.getByTestId('box') as HTMLDivElement;
      expect(box.tagName).to.equal('DIV');
      expect(box.style.display).to.equal('flex');
      expect(box.style.flexDirection).to.equal('column');
      expect(box.style.boxSizing).to.equal('border-box');
      // padding survives from the first entry; color ends up from the last non-falsy entry
      expect(box.style.padding).to.equal('4px');
      expect(box.style.color).to.equal('blue');
      expect(box.style.margin).to.equal('2px');
    },
  },
  {
    name: "a View given a raw string (or number) child throws, per React Native's rule that text must be wrapped in <Text>",
    run: async (ctx) => {
      const { mod, render, expect } = ctx;
      const { View } = mod as unknown as Mod;

      expect(() => render(<View>plain text</View>)).to.throw(/Text/);
      cleanup();
      expect(() => render(<View>{42}</View>)).to.throw(/Text/);
    },
  },
  {
    name: "usePlatform's select picks the entry matching the PlatformProvider's os, falling back to default when there's no match",
    run: async (ctx) => {
      const { mod, render, screen, expect } = ctx;
      const { PlatformProvider, usePlatform, Text } = mod as unknown as Mod;

      function Probe() {
        const { OS, select } = usePlatform();
        const label = select({ ios: 'on-ios', android: 'on-android', default: 'fallback' });
        return <Text data-testid="probe">{`${OS}:${label}`}</Text>;
      }

      render(
        <PlatformProvider os="ios">
          <Probe />
        </PlatformProvider>,
      );
      expect(screen.getByTestId('probe').textContent).to.equal('ios:on-ios');
      cleanup();

      render(
        <PlatformProvider os="web">
          <Probe />
        </PlatformProvider>,
      );
      // 'web' has no explicit entry in the spec above, so it must fall back to `default`
      expect(screen.getByTestId('probe').textContent).to.equal('web:fallback');
    },
  },
  {
    name: 'usePlatform defaults OS to "web" with no PlatformProvider wrapping the component',
    run: async (ctx) => {
      const { mod, render, screen, expect } = ctx;
      const { usePlatform, Text } = mod as unknown as Mod;

      function Probe() {
        const { OS } = usePlatform();
        return <Text data-testid="probe">{OS}</Text>;
      }

      render(<Probe />);
      expect(screen.getByTestId('probe').textContent).to.equal('web');
    },
  },
  {
    name: "Pressable renders a native button wired to onPress, and its style function receives the live pressed state",
    run: async (ctx) => {
      const { mod, render, screen, user, expect } = ctx;
      const { Pressable, Text } = mod as unknown as Mod;

      let pressCount = 0;
      render(
        <Pressable
          data-testid="btn"
          onPress={() => {
            pressCount += 1;
          }}
          style={({ pressed }) => [{ backgroundColor: 'blue' }, pressed && { backgroundColor: 'darkblue' }]}
        >
          <Text>Go</Text>
        </Pressable>,
      );

      const btn = screen.getByTestId('btn') as HTMLButtonElement;
      expect(btn.tagName).to.equal('BUTTON');
      expect(btn.style.backgroundColor).to.equal('blue');

      await user.pointer([{ target: btn, keys: '[MouseLeft>]' }]);
      expect(btn.style.backgroundColor).to.equal('darkblue');

      // releasing over the same element completes a full press-and-release,
      // which fires onPress exactly once
      await user.pointer([{ target: btn, keys: '[/MouseLeft]' }]);
      expect(btn.style.backgroundColor).to.equal('blue');
      expect(pressCount).to.equal(1);
    },
  },
];
