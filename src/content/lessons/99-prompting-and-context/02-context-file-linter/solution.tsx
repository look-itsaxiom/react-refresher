export type Rule = { text: string; scope?: string };
export type Section = { heading: string; rules: Rule[] };
export type ContextFile = { sections: Section[]; imports: string[]; commands: string[] };

export type Finding = {
  rule: 'missing-commands' | 'too-long' | 'contradiction' | 'secret' | 'too-long-file' | 'stale-fact';
  severity: 'error' | 'warn' | 'info';
  message: string;
};

/** Major versions declared as dependency ranges, e.g. `{ react: '^19.3.0' }`. */
export type PackageInfo = Partial<Record<'react' | 'typescript' | 'vite', string>>;

const HEADING_LINE = /^(#{1,6})\s+(.+)$/;
const BULLET_LINE = /^[-*]\s+(.*)$/;
/** Matches a rule's optional `[glob: <pattern>] ` prefix. */
export const GLOB_RULE = /^\[glob:\s*([^\]]+)\]\s*(.*)$/;
/** A line that is nothing but an `@path` import token. */
export const IMPORT_LINE = /^@(\S+)$/;

const SECRET_PATTERNS = [/sk-/i, /ghp_/i, /AKIA/i, /password=/i];
const DISPLAY_NAME: Record<keyof PackageInfo, string> = {
  react: 'React',
  typescript: 'TypeScript',
  vite: 'Vite',
};

function wordCount(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean);
  return words.length;
}

export function parseContextFile(markdown: string): ContextFile {
  const sections: Section[] = [];
  const imports: string[] = [];
  const commands: string[] = [];

  let currentSection: Section | null = null;
  let inCommandsSection = false;
  let inBashBlock = false;

  const lines = markdown.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();

    const headingMatch = HEADING_LINE.exec(line);
    if (headingMatch) {
      const heading = headingMatch[2]!.trim();
      currentSection = { heading, rules: [] };
      sections.push(currentSection);
      inCommandsSection = heading.toLowerCase() === 'commands';
      inBashBlock = false;
      continue;
    }

    if (inCommandsSection) {
      if (line === '```bash') {
        inBashBlock = true;
        continue;
      }
      if (line === '```' && inBashBlock) {
        inBashBlock = false;
        continue;
      }
      if (inBashBlock) {
        if (line.length > 0) commands.push(line);
        continue;
      }
    }

    const importMatch = IMPORT_LINE.exec(line);
    if (importMatch) {
      imports.push(importMatch[1]!);
      continue;
    }

    const bulletMatch = BULLET_LINE.exec(line);
    if (bulletMatch && currentSection) {
      const remainder = bulletMatch[1]!.trim();
      const globMatch = GLOB_RULE.exec(remainder);
      if (globMatch) {
        currentSection.rules.push({ text: globMatch[2]!.trim(), scope: globMatch[1]!.trim() });
      } else {
        currentSection.rules.push({ text: remainder });
      }
    }
  }

  return { sections, imports, commands };
}

function normalizeSubject(subject: string): string {
  return subject.trim().toLowerCase().replace(/[.!]+$/, '').replace(/\s+/g, ' ');
}

export function lintContextFile(file: ContextFile, packageJson?: PackageInfo): Finding[] {
  const findings: Finding[] = [];
  const allRules: Rule[] = file.sections.flatMap((s) => s.rules);

  if (file.commands.length === 0) {
    findings.push({
      rule: 'missing-commands',
      severity: 'warn',
      message: 'No Commands section with a fenced bash block; add one so an agent knows how to verify its work.',
    });
  }

  for (const rule of allRules) {
    if (rule.text.length > 200) {
      findings.push({
        rule: 'too-long',
        severity: 'info',
        message: `Rule is ${rule.text.length} characters; consider splitting it: "${rule.text.slice(0, 60)}..."`,
      });
    }
  }

  const alwaysSubjects = new Map<string, string>();
  const neverSubjects = new Map<string, string>();
  for (const rule of allRules) {
    const alwaysMatch = /^always\s+(.*)$/i.exec(rule.text);
    const neverMatch = /^never\s+(.*)$/i.exec(rule.text);
    if (alwaysMatch) alwaysSubjects.set(normalizeSubject(alwaysMatch[1]!), rule.text);
    if (neverMatch) neverSubjects.set(normalizeSubject(neverMatch[1]!), rule.text);
  }
  for (const [subject, alwaysText] of alwaysSubjects) {
    const neverText = neverSubjects.get(subject);
    if (neverText) {
      findings.push({
        rule: 'contradiction',
        severity: 'error',
        message: `Contradiction on "${subject}": "${alwaysText}" vs. "${neverText}".`,
      });
    }
  }

  for (const rule of allRules) {
    if (SECRET_PATTERNS.some((pattern) => pattern.test(rule.text))) {
      findings.push({
        rule: 'secret',
        severity: 'error',
        message: `Rule looks like it contains a secret: "${rule.text}". Remove it from the context file.`,
      });
    }
  }

  const totalWords =
    file.sections.reduce((sum, s) => sum + wordCount(s.heading) + s.rules.reduce((rs, r) => rs + wordCount(r.text), 0), 0) +
    file.imports.reduce((sum, i) => sum + wordCount(i), 0) +
    file.commands.reduce((sum, c) => sum + wordCount(c), 0);
  if (totalWords > 1500) {
    findings.push({
      rule: 'too-long-file',
      severity: 'warn',
      message: `This file is about ${totalWords} words; split into @imports or a skill instead of one long file.`,
    });
  }

  if (packageJson) {
    const versionRe = /\b(React|TypeScript|Vite)\s+(\d+)\b/gi;
    for (const rule of allRules) {
      for (const match of rule.text.matchAll(versionRe)) {
        const displayName = match[1]!;
        const statedMajor = match[2]!;
        const depKey = (Object.keys(DISPLAY_NAME) as (keyof PackageInfo)[]).find(
          (key) => DISPLAY_NAME[key].toLowerCase() === displayName.toLowerCase(),
        );
        if (!depKey) continue;
        const range = packageJson[depKey];
        if (!range) continue;
        const actualMajorMatch = /(\d+)/.exec(range);
        if (!actualMajorMatch) continue;
        const actualMajor = actualMajorMatch[1]!;
        if (actualMajor !== statedMajor) {
          findings.push({
            rule: 'stale-fact',
            severity: 'warn',
            message: `Rule says ${DISPLAY_NAME[depKey]} ${statedMajor}, but package.json has ${depKey}@${range} (major ${actualMajor}). Update or remove this rule.`,
          });
        }
      }
    }
  }

  return findings;
}

const SAMPLE = `# Conventions

- Always use named exports for components.

# Commands

\`\`\`bash
pnpm test
\`\`\`
`;

export default function App() {
  const file = parseContextFile(SAMPLE);
  const findings = lintContextFile(file, { react: '^19.3.0' });
  return (
    <div style={{ padding: 16, fontFamily: 'monospace' }}>
      <h2>Sections: {file.sections.length}</h2>
      <h2>Commands: {JSON.stringify(file.commands)}</h2>
      <h2>Findings</h2>
      {findings.length === 0 ? (
        <p>No findings.</p>
      ) : (
        <ul>
          {findings.map((f, i) => (
            <li key={i}>
              [{f.severity}/{f.rule}] {f.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
