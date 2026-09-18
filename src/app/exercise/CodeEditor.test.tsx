import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { EditorView } from '@codemirror/view';
import { CodeEditor } from './CodeEditor';

describe('CodeEditor', () => {
  it('does not fire onChange when `value` changes programmatically, only for real user edits', () => {
    const onChange = vi.fn();
    const { container, rerender } = render(<CodeEditor value="a" onChange={onChange} />);

    rerender(<CodeEditor value="b" onChange={onChange} />);
    expect(onChange).not.toHaveBeenCalled();

    const editorDom = container.querySelector('.cm-editor');
    expect(editorDom).not.toBeNull();
    const view = EditorView.findFromDOM(editorDom as HTMLElement);
    expect(view).not.toBeNull();

    view!.dispatch({ changes: { from: 0, to: view!.state.doc.length, insert: 'c' } });
    expect(onChange).toHaveBeenCalledWith('c');
  });
});
