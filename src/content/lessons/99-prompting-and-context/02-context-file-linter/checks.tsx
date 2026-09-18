import type { Check } from '../../../types';

type Rule = { text: string; scope?: string };
type Section = { heading: string; rules: Rule[] };
type ContextFile = { sections: Section[]; imports: string[]; commands: string[] };
type Finding = { rule: string; severity: 'error' | 'warn' | 'info'; message: string };

export const checks: Check[] = [
  {
    name: 'parseContextFile: groups bullets under their heading and parses a [glob: ...] prefix into scope',
    run: async ({ mod, expect }) => {
      const parseContextFile = mod.parseContextFile as (markdown: string) => ContextFile;
      const markdown = [
        '# Conventions',
        '',
        '- Always use named exports for components.',
        '- [glob: src/**/*.tsx] Co-locate a component with its test file.',
        '',
        '# Testing',
        '',
        '- Prefer Testing Library queries over test ids.',
      ].join('\n');

      const file = parseContextFile(markdown);
      expect(file.sections).to.have.lengthOf(2);
      expect(file.sections[0]!.heading).to.equal('Conventions');
      expect(file.sections[0]!.rules).to.have.lengthOf(2);
      expect(file.sections[0]!.rules[0]).to.deep.equal({ text: 'Always use named exports for components.' });
      expect(file.sections[0]!.rules[1]!.scope).to.equal('src/**/*.tsx');
      expect(file.sections[0]!.rules[1]!.text).to.equal('Co-locate a component with its test file.');
      expect(file.sections[1]!.heading).to.equal('Testing');
      expect(file.sections[1]!.rules).to.have.lengthOf(1);
    },
  },
  {
    name: 'parseContextFile: collects @path imports and only pulls bash lines into commands under a "Commands" heading',
    run: async ({ mod, expect }) => {
      const parseContextFile = mod.parseContextFile as (markdown: string) => ContextFile;
      const markdown = [
        '# Setup',
        '',
        '@docs/testing.md',
        '',
        '```bash',
        'echo not-a-command-because-wrong-heading',
        '```',
        '',
        '# Commands',
        '',
        '```bash',
        'pnpm test',
        'pnpm typecheck',
        '```',
      ].join('\n');

      const file = parseContextFile(markdown);
      expect(file.imports).to.deep.equal(['docs/testing.md']);
      expect(file.commands).to.deep.equal(['pnpm test', 'pnpm typecheck']);
    },
  },
  {
    name: 'lintContextFile: warns "missing-commands" when there are no parsed commands, and not when there are',
    run: async ({ mod, expect }) => {
      const lintContextFile = mod.lintContextFile as (file: ContextFile, pkg?: unknown) => Finding[];
      const withoutCommands: ContextFile = { sections: [{ heading: 'Notes', rules: [{ text: 'Keep it short.' }] }], imports: [], commands: [] };
      const withCommands: ContextFile = { ...withoutCommands, commands: ['pnpm test'] };

      const findingsA = lintContextFile(withoutCommands);
      const findingsB = lintContextFile(withCommands);
      expect(findingsA.some((f) => f.rule === 'missing-commands')).to.equal(true);
      expect(findingsB.some((f) => f.rule === 'missing-commands')).to.equal(false);
    },
  },
  {
    name: 'lintContextFile: flags a rule over 200 characters as "too-long" info, and not a short rule',
    run: async ({ mod, expect }) => {
      const lintContextFile = mod.lintContextFile as (file: ContextFile) => Finding[];
      const longText = 'Always ' + 'x'.repeat(210);
      const file: ContextFile = {
        sections: [{ heading: 'Notes', rules: [{ text: longText }, { text: 'Short rule.' }] }],
        imports: [],
        commands: ['pnpm test'],
      };
      const findings = lintContextFile(file);
      const tooLong = findings.filter((f) => f.rule === 'too-long');
      expect(tooLong).to.have.lengthOf(1);
      expect(tooLong[0]!.severity).to.equal('info');
    },
  },
  {
    name: 'lintContextFile: reports "contradiction" for "always X" vs "never X" (same normalized subject), even punctuated differently',
    run: async ({ mod, expect }) => {
      const lintContextFile = mod.lintContextFile as (file: ContextFile) => Finding[];
      const file: ContextFile = {
        sections: [
          {
            heading: 'Rules',
            rules: [{ text: 'Always ask before changing a test.' }, { text: 'Never Ask Before Changing A Test' }, { text: 'Prefer arrow functions.' }],
          },
        ],
        imports: [],
        commands: ['pnpm test'],
      };
      const findings = lintContextFile(file);
      const contradictions = findings.filter((f) => f.rule === 'contradiction');
      expect(contradictions).to.have.lengthOf(1);
      expect(contradictions[0]!.severity).to.equal('error');
    },
  },
  {
    name: 'lintContextFile: reports "secret" for rules containing sk-, ghp_, AKIA, or password=, and not for an unrelated rule',
    run: async ({ mod, expect }) => {
      const lintContextFile = mod.lintContextFile as (file: ContextFile) => Finding[];
      const file: ContextFile = {
        sections: [
          {
            heading: 'Setup',
            rules: [
              { text: 'API key is sk-abc123, keep it here for convenience.' },
              { text: 'CI token: ghp_abcdefg' },
              { text: 'Use AKIAEXAMPLE for the deploy user.' },
              { text: 'Default password=changeme for local dev.' },
              { text: 'Run the dev server on port 5180.' },
            ],
          },
        ],
        imports: [],
        commands: ['pnpm test'],
      };
      const findings = lintContextFile(file);
      const secrets = findings.filter((f) => f.rule === 'secret');
      expect(secrets).to.have.lengthOf(4);
      expect(secrets.every((f) => f.severity === 'error')).to.equal(true);
    },
  },
  {
    name: 'lintContextFile: with a packageJson, flags a stale major-version claim for react/typescript/vite and not a correct one',
    run: async ({ mod, expect }) => {
      const lintContextFile = mod.lintContextFile as (file: ContextFile, pkg?: Record<string, string>) => Finding[];
      const file: ContextFile = {
        sections: [
          {
            heading: 'Conventions',
            rules: [
              { text: 'This project targets React 18 class components where possible.' },
              { text: 'We build with Vite 8.' },
            ],
          },
        ],
        imports: [],
        commands: ['pnpm test'],
      };
      const findings = lintContextFile(file, { react: '^19.3.0', vite: '^8.3.0' });
      const stale = findings.filter((f) => f.rule === 'stale-fact');
      expect(stale).to.have.lengthOf(1);
      expect(stale[0]!.message.toLowerCase()).to.include('react');

      const findingsNoPkg = lintContextFile(file);
      expect(findingsNoPkg.some((f) => f.rule === 'stale-fact')).to.equal(false);
    },
  },
  {
    name: 'end-to-end: a well-formed context file produces zero error-severity findings',
    run: async ({ mod, expect }) => {
      const parseContextFile = mod.parseContextFile as (markdown: string) => ContextFile;
      const lintContextFile = mod.lintContextFile as (file: ContextFile, pkg?: Record<string, string>) => Finding[];
      const markdown = [
        '# Conventions',
        '',
        '- Use named exports for components.',
        '- [glob: src/**/*.tsx] Co-locate a component with its test file.',
        '',
        '# Commands',
        '',
        '```bash',
        'pnpm test',
        'pnpm typecheck',
        '```',
      ].join('\n');
      const file = parseContextFile(markdown);
      const findings = lintContextFile(file, { react: '^19.3.0' });
      expect(findings.filter((f) => f.severity === 'error')).to.have.lengthOf(0);
    },
  },
  {
    name: 'end-to-end: a bad context file surfaces contradiction, secret, and stale-fact findings together',
    run: async ({ mod, expect }) => {
      const parseContextFile = mod.parseContextFile as (markdown: string) => ContextFile;
      const lintContextFile = mod.lintContextFile as (file: ContextFile, pkg?: Record<string, string>) => Finding[];
      const markdown = [
        '# Conventions',
        '',
        '- Always use React 18 class components for new work.',
        '- Never use React 18 class components for new work.',
        '- Deploy key: AKIAEXAMPLEKEY for the staging bucket.',
      ].join('\n');
      const file = parseContextFile(markdown);
      const findings = lintContextFile(file, { react: '^19.3.0' });
      const rules = new Set(findings.map((f) => f.rule));
      expect(rules.has('contradiction')).to.equal(true);
      expect(rules.has('secret')).to.equal(true);
      expect(rules.has('stale-fact')).to.equal(true);
      expect(rules.has('missing-commands')).to.equal(true);
    },
  },
];
