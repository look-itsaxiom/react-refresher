import { createContext, useContext, useState, type ReactNode, type ButtonHTMLAttributes, type HTMLAttributes } from 'react';

export type PlatformOS = 'ios' | 'android' | 'web';

export type Style = Record<string, unknown> | false | null | undefined;

export function flattenStyle(style: Style | Style[]): Record<string, unknown> {
  // TODO: flatten left to right (later entries win per property), skipping
  // falsy entries entirely.
  return {};
}

export const StyleSheet = {
  create<T extends Record<string, Record<string, unknown>>>(styles: T): T {
    return styles;
  },
};

const PlatformContext = createContext<PlatformOS>('web');

export function PlatformProvider({ os, children }: { os: PlatformOS; children: ReactNode }) {
  return <PlatformContext.Provider value={os}>{children}</PlatformContext.Provider>;
}

export function usePlatform() {
  const OS = useContext(PlatformContext);
  // TODO: return { OS, select } where select picks the entry matching OS,
  // falling back to `default` when there's no entry for this platform.
  return {
    OS,
    select<T>(spec: { ios?: T; android?: T; web?: T; default?: T }): T | undefined {
      return undefined;
    },
  };
}

type ViewProps = { style?: Style | Style[]; children?: ReactNode } & Omit<HTMLAttributes<HTMLDivElement>, 'style' | 'children'>;

export function View({ style, children, ...rest }: ViewProps) {
  // TODO: throw a descriptive Error if `children` contains a raw string or
  // number (React Native's rule: text must be wrapped in <Text>). Then
  // render a <div> with the flex/column/box-sizing defaults applied first,
  // and the caller's flattened style layered on top.
  return <div {...rest}>{children}</div>;
}

type TextProps = { style?: Style | Style[]; children?: ReactNode } & Omit<HTMLAttributes<HTMLSpanElement>, 'style' | 'children'>;

export function Text({ style, children, ...rest }: TextProps) {
  // TODO: render a <span> with the flattened style.
  return <span {...rest}>{children}</span>;
}

type PressState = { pressed: boolean };
type PressableStyle = Style | Style[] | ((state: PressState) => Style | Style[]);

type PressableProps = {
  style?: PressableStyle;
  onPress?: () => void;
  children?: ReactNode | ((state: PressState) => ReactNode);
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'style' | 'onClick' | 'children'>;

export function Pressable({ style, onPress, children, ...rest }: PressableProps) {
  const [pressed, setPressed] = useState(false);
  // TODO: resolve `style` and `children` against { pressed }, track pressed
  // state via pointer down/up/leave, and wire onPress to the click.
  return (
    <button onClick={onPress} {...rest}>
      {typeof children === 'function' ? children({ pressed }) : children}
    </button>
  );
}

export default function App() {
  return (
    <PlatformProvider os="ios">
      <Demo />
    </PlatformProvider>
  );
}

function Demo() {
  const { OS, select } = usePlatform();
  const label = select({ ios: 'Running on iOS', android: 'Running on Android', web: 'Running on the web', default: 'Unknown platform' });

  return (
    <View style={[{ padding: 16 }, { gap: 8 }]}>
      <Text>{label ?? `Platform.OS is "${OS}"`}</Text>
      <Pressable
        onPress={() => console.log('pressed')}
        style={({ pressed }) => [{ padding: 8, backgroundColor: '#3366ff' }, pressed && { backgroundColor: '#1a3aa6' }]}
      >
        <Text>Press me</Text>
      </Pressable>
    </View>
  );
}
