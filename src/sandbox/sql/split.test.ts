import { describe, it, expect } from 'vitest';
import { splitStatements } from './split';

describe('splitStatements', () => {
  it('splits on semicolons outside strings, comments, and dollar quotes', () => {
    const script = `
      -- a comment; with a semicolon
      create table t (id int, note text default 'a;b');
      insert into t values (1, $$x;y$$);
      /* block; comment */ select 1;
    `;
    expect(splitStatements(script)).toEqual([
      "create table t (id int, note text default 'a;b')",
      'insert into t values (1, $$x;y$$)',
      'select 1',
    ]);
  });

  it('keeps a trailing statement without a semicolon and drops empties', () => {
    expect(splitStatements('select 1;;  select 2')).toEqual(['select 1', 'select 2']);
    expect(splitStatements('   ')).toEqual([]);
  });
});
