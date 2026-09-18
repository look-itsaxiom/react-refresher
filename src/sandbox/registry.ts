import * as React from 'react';
import * as JsxRuntime from 'react/jsx-runtime';
import * as JsxDevRuntime from 'react/jsx-dev-runtime';
import * as ReactDOM from 'react-dom';
import * as ReactDOMClient from 'react-dom/client';
import * as Todos from './server/todos';
import * as Users from './server/users';
import * as Posts from './server/posts';
import { esm, type ModuleRegistry } from './modules';

/** Everything user code may import. Same instances as the host, so hooks and roots work. */
export const baseRegistry: ModuleRegistry = {
  react: esm(React),
  'react/jsx-runtime': esm(JsxRuntime),
  'react/jsx-dev-runtime': esm(JsxDevRuntime),
  'react-dom': esm(ReactDOM),
  'react-dom/client': esm(ReactDOMClient),
  '@server/todos': esm(Todos),
  '@server/users': esm(Users),
  '@server/posts': esm(Posts),
};
