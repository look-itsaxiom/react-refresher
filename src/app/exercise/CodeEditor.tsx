import { useEffect, useEffectEvent, useRef } from 'react';
import { Annotation, EditorState, Prec } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import { basicSetup } from 'codemirror';
import { indentWithTab } from '@codemirror/commands';
import { javascript } from '@codemirror/lang-javascript';
import { oneDark } from '@codemirror/theme-one-dark';
import { useTheme } from '../theme';

type Props = {
  value: string;
  onChange?: (next: string) => void;
  onRun?: () => void;
  readOnly?: boolean;
};

// Marks a dispatch as programmatic (prop-driven doc sync), so the update listener can
// tell it apart from a real user edit and skip firing `onChange` for it.
const External = Annotation.define<boolean>();

export function CodeEditor({ value, onChange, onRun, readOnly = false }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const theme = useTheme();

  // Effect Events: always see the latest props without re-creating the editor.
  const handleChange = useEffectEvent((next: string) => onChange?.(next));
  const handleRun = useEffectEvent(() => onRun?.());

  useEffect(() => {
    if (!host.current) return;
    const state = EditorState.create({
      doc: value,
      extensions: [
        Prec.highest(keymap.of([{ key: 'Mod-Enter', run: () => { handleRun(); return true; } }])),
        keymap.of([indentWithTab]),
        basicSetup,
        javascript({ jsx: true, typescript: true }),
        ...(theme === 'dark' ? [oneDark] : []),
        EditorState.readOnly.of(readOnly),
        EditorView.editable.of(!readOnly),
        EditorView.updateListener.of((u) => {
          if (!u.docChanged) return;
          if (u.transactions.some((t) => t.annotation(External))) return;
          handleChange(u.state.doc.toString());
        }),
        EditorView.theme({ '&': { height: '100%', fontSize: '13px' }, '.cm-scroller': { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' } }),
      ],
    });
    const v = new EditorView({ state, parent: host.current });
    view.current = v;
    return () => { v.destroy(); view.current = null; };
    // Re-create only when theme or readOnly changes; `value` is synced by the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme, readOnly]);

  useEffect(() => {
    const v = view.current;
    if (!v) return;
    const current = v.state.doc.toString();
    if (current !== value) {
      v.dispatch({ changes: { from: 0, to: current.length, insert: value }, annotations: External.of(true) });
    }
  }, [value]);

  return <div ref={host} className="h-full min-h-0 overflow-hidden" />;
}
