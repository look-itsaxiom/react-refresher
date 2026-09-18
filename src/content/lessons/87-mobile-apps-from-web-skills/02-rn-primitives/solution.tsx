import { createContext, useContext, useState, type ReactNode, type ButtonHTMLAttributes, type HTMLAttributes, type CSSProperties } from 'react';

export type PlatformOS = 'ios' | 'android' | 'web';

export type Style = Record<string, unknown> | false | null | undefined;

export function flattenStyle(style: Style | Style[]): Record<string, unknown> {
  const list = Array.isArray(style) ? style : [style];
  const result: Record<string, unknown> = {};
  for (const entry of list) {
    if (!entry) continue;
    Object.assign(result, entry);
  }
  return result;
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

  function select<T>(spec: { ios?: T; android?: T; web?: T; default?: T }): T | undefined {
    if (OS === 'ios' && spec.ios !== undefined) return spec.ios;
    if (OS === 'android' && spec.android !== undefined) return spec.android;
    if (OS === 'web' && spec.web !== undefined) return spec.web;
    return spec.default;
  }

  return { OS, select };
}

type ViewProps = { style?: Style | Style[]; children?: ReactNode } & Omit<HTMLAttributes<HTMLDivElement>, 'style' | 'children'>;

export function View({ style, children, ...rest }: ViewProps) {
  for (const child of Array.isArray(children) ? children : [children]) {
    if (typeof child === 'string' || typeof child === 'number') {
      throw new Error(
        `Invariant Violation: Text string "${String(child)}" must be rendered within a <Text> component, not directly inside a <View>.`,
      );
    }
  }

  const defaults: CSSProperties = { display: 'flex', flexDirection: 'column', boxSizing: 'border-box' };
  const merged = { ...defaults, ...flattenStyle(style) } as CSSProperties;

  return (
    <div style={merged} {...rest}>
      {children}
    </div>
  );
}

type TextProps = { style?: Style | Style[]; children?: ReactNode } & Omit<HTMLAttributes<HTMLSpanElement>, 'style' | 'children'>;

export function Text({ style, children, ...rest }: TextProps) {
  return (
    <span style={flattenStyle(style) as CSSProperties} {...rest}>
      {children}
    </span>
  );
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
  const state: PressState = { pressed };

  const resolvedStyle = typeof style === 'function' ? style(state) : style;
  const resolvedChildren = typeof children === 'function' ? children(state) : children;

  return (
    <button
      style={flattenStyle(resolvedStyle) as CSSProperties}
      onClick={onPress}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      {...rest}
    >
      {resolvedChildren}
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
