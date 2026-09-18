import { createContext, isValidElement, useContext, useId, useRef, useState, type ReactElement, type ReactNode } from 'react';

// ---------------------------------------------------------------------------
// useControllableState
// ---------------------------------------------------------------------------

export function useControllableState<T>({
  value,
  defaultValue,
  onChange,
}: {
  value?: T;
  defaultValue: T;
  onChange?: (value: T) => void;
}): [T, (value: T) => void] {
  const [uncontrolled, setUncontrolled] = useState(defaultValue);

  // TODO: switch into controlled mode when `value` is defined, and make sure the
  // setter never mutates internal state while controlled — it should only call
  // `onChange`.
  void value;
  void onChange;

  function setValue(next: T) {
    setUncontrolled(next);
  }

  return [uncontrolled, setValue];
}

// ---------------------------------------------------------------------------
// Slot
// ---------------------------------------------------------------------------

type AnyProps = Record<string, unknown>;

function composeRefs<T>(..._refs: Array<React.Ref<T> | undefined>) {
  // TODO: return a callback ref that sets every ref in `_refs` to the node, and on
  // cleanup either calls each ref's own cleanup function (React 19) or re-invokes the
  // ref-setting logic with `null`.
  return (_node: T | null) => {};
}

function mergeSlotProps(_slotProps: AnyProps, _childProps: AnyProps): AnyProps {
  // TODO: implement the merge rules described in the prompt.
  return {};
}

export function Slot({
  children,
  ref,
  ...slotProps
}: { children: ReactNode; ref?: React.Ref<unknown> } & AnyProps) {
  if (!isValidElement(children)) return null;
  // TODO: merge slotProps onto the child's props and compose refs, then clone the child.
  void ref;
  void slotProps;
  return children as ReactElement;
}

// ---------------------------------------------------------------------------
// Tabs
// ---------------------------------------------------------------------------

type TabsContextValue = {
  value: string;
  setValue: (value: string) => void;
  orientation: 'horizontal' | 'vertical';
  baseId: string;
};

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext(component: string) {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error(`${component} must be used inside <Tabs.Root>`);
  return ctx;
}

function Root({
  value,
  defaultValue,
  onValueChange,
  orientation = 'horizontal',
  children,
}: {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  orientation?: 'horizontal' | 'vertical';
  children: ReactNode;
}) {
  const [current, setCurrent] = useControllableState({
    value,
    defaultValue: defaultValue ?? '',
    onChange: onValueChange,
  });
  const baseId = useId();

  return (
    <TabsContext.Provider value={{ value: current, setValue: setCurrent, orientation, baseId }}>
      {children}
    </TabsContext.Provider>
  );
}

function List({ children, ...rest }: { children: ReactNode } & AnyProps) {
  const { orientation } = useTabsContext('Tabs.List');
  const ref = useRef<HTMLDivElement>(null);

  function handleKeyDown(_event: React.KeyboardEvent) {
    // TODO: move focus (and activate) between `[role="tab"]` elements inside `ref`,
    // using ArrowRight/ArrowLeft (or ArrowDown/ArrowUp when vertical), Home, and End,
    // wrapping at the ends.
  }

  return (
    <div ref={ref} role="tablist" aria-orientation={orientation} onKeyDown={handleKeyDown} {...rest}>
      {children}
    </div>
  );
}

function Trigger({
  value,
  asChild,
  children,
  ...rest
}: { value: string; asChild?: boolean; children: ReactNode } & AnyProps) {
  const { value: activeValue, baseId } = useTabsContext('Tabs.Trigger');
  const isActive = activeValue === value;
  void isActive;
  void baseId;
  void asChild;

  // TODO: render `role="tab"` with aria-selected/aria-controls/data-state/roving
  // tabIndex, activate on click, and support `asChild` via `Slot`.
  return (
    <button type="button" {...rest}>
      {children}
    </button>
  );
}

function Content({ value, children, ...rest }: { value: string; children: ReactNode } & AnyProps) {
  const { value: activeValue, baseId } = useTabsContext('Tabs.Content');
  void baseId;
  if (activeValue !== value) return null;

  // TODO: render `role="tabpanel"` with aria-labelledby pointing at the matching trigger.
  return (
    <div role="tabpanel" {...rest}>
      {children}
    </div>
  );
}

export const Tabs = { Root, List, Trigger, Content };

// ---------------------------------------------------------------------------
// Demo
// ---------------------------------------------------------------------------

export default function App() {
  return (
    <Tabs.Root defaultValue="account">
      <Tabs.List aria-label="Settings">
        <Tabs.Trigger value="account">Account</Tabs.Trigger>
        <Tabs.Trigger value="password">Password</Tabs.Trigger>
        <Tabs.Trigger value="billing">Billing</Tabs.Trigger>
      </Tabs.List>
      <Tabs.Content value="account">Account settings go here.</Tabs.Content>
      <Tabs.Content value="password">Change your password.</Tabs.Content>
      <Tabs.Content value="billing">Manage billing.</Tabs.Content>
    </Tabs.Root>
  );
}
