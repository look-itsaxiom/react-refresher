import { cloneElement, createContext, isValidElement, useContext, useId, useRef, useState, type ReactElement, type ReactNode } from 'react';

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
  const isControlled = value !== undefined;
  const current = isControlled ? value : uncontrolled;

  function setValue(next: T) {
    if (!isControlled) setUncontrolled(next);
    onChange?.(next);
  }

  return [current, setValue];
}

// ---------------------------------------------------------------------------
// Slot
// ---------------------------------------------------------------------------

type AnyProps = Record<string, unknown>;

function setRef<T>(ref: React.Ref<T> | undefined, node: T | null): (() => void) | void {
  if (typeof ref === 'function') {
    return ref(node) as (() => void) | void;
  }
  if (ref && typeof ref === 'object' && 'current' in ref) {
    (ref as React.RefObject<T | null>).current = node;
  }
}

function composeRefs<T>(...refs: Array<React.Ref<T> | undefined>) {
  return (node: T | null) => {
    const cleanups = refs.map((ref) => setRef(ref, node));
    return () => {
      cleanups.forEach((cleanup, index) => {
        if (typeof cleanup === 'function') {
          cleanup();
        } else {
          setRef(refs[index], null);
        }
      });
    };
  };
}

function isEventHandlerKey(key: string) {
  return key.length > 2 && key.startsWith('on') && key[2] === key[2]?.toUpperCase();
}

function mergeSlotProps(slotProps: AnyProps, childProps: AnyProps): AnyProps {
  const merged: AnyProps = { ...slotProps, ...childProps };

  for (const key of Object.keys(slotProps)) {
    const slotValue = slotProps[key];
    const childValue = childProps[key];

    if (isEventHandlerKey(key) && typeof slotValue === 'function') {
      merged[key] =
        typeof childValue === 'function'
          ? (...args: unknown[]) => {
              (childValue as (...a: unknown[]) => void)(...args);
              (slotValue as (...a: unknown[]) => void)(...args);
            }
          : slotValue;
    } else if (key === 'style' && typeof slotValue === 'object' && slotValue !== null) {
      merged[key] = { ...(slotValue as object), ...((childValue as object) ?? {}) };
    } else if (key === 'className') {
      merged[key] = [slotValue, childValue].filter(Boolean).join(' ');
    }
  }

  return merged;
}

export function Slot({
  children,
  ref,
  ...slotProps
}: { children: ReactNode; ref?: React.Ref<unknown> } & AnyProps) {
  if (!isValidElement(children)) return null;
  const { ref: childRef, ...childProps } = children.props as AnyProps & { ref?: React.Ref<unknown> };
  const merged = mergeSlotProps(slotProps, childProps);
  return cloneElement(children as ReactElement<AnyProps>, {
    ...merged,
    ref: composeRefs(ref, childRef),
  });
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
  const { orientation, setValue } = useTabsContext('Tabs.List');
  const ref = useRef<HTMLDivElement>(null);

  function handleKeyDown(event: React.KeyboardEvent) {
    const container = ref.current;
    if (!container) return;
    const tabs = Array.from(container.querySelectorAll<HTMLElement>('[role="tab"]'));
    if (tabs.length === 0) return;

    const currentIndex = tabs.indexOf(document.activeElement as HTMLElement);
    const nextKey = orientation === 'vertical' ? 'ArrowDown' : 'ArrowRight';
    const prevKey = orientation === 'vertical' ? 'ArrowUp' : 'ArrowLeft';

    let nextIndex: number | null = null;
    if (event.key === nextKey) nextIndex = (currentIndex + 1 + tabs.length) % tabs.length;
    else if (event.key === prevKey) nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = tabs.length - 1;

    if (nextIndex === null) return;
    event.preventDefault();
    const target = tabs[nextIndex];
    if (!target) return;
    target.focus();
    const nextValue = target.dataset.tabValue;
    if (nextValue !== undefined) setValue(nextValue);
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
  const { value: activeValue, setValue, baseId } = useTabsContext('Tabs.Trigger');
  const isActive = activeValue === value;
  const Comp = asChild ? Slot : 'button';

  return (
    <Comp
      role="tab"
      type={asChild ? undefined : 'button'}
      id={`${baseId}-trigger-${value}`}
      aria-selected={isActive}
      aria-controls={`${baseId}-content-${value}`}
      data-state={isActive ? 'active' : 'inactive'}
      data-tab-value={value}
      tabIndex={isActive ? 0 : -1}
      onClick={() => setValue(value)}
      {...rest}
    >
      {children}
    </Comp>
  );
}

function Content({ value, children, ...rest }: { value: string; children: ReactNode } & AnyProps) {
  const { value: activeValue, baseId } = useTabsContext('Tabs.Content');
  if (activeValue !== value) return null;

  return (
    <div role="tabpanel" id={`${baseId}-content-${value}`} aria-labelledby={`${baseId}-trigger-${value}`} {...rest}>
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
