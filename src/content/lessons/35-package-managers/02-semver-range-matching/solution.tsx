export type Version = { major: number; minor: number; patch: number; prerelease: string | null };

export function parseVersion(v: string): Version {
  const m = v.match(/^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/);
  if (!m) throw new Error(`Invalid version: ${v}`);
  return { major: Number(m[1]), minor: Number(m[2]), patch: Number(m[3]), prerelease: m[4] ?? null };
}

type Op = '*' | '=' | '^' | '~' | '>=' | '<';

function splitComparator(comparator: string): { op: Op; base: Version } {
  const c = comparator.trim();
  if (c === '*') return { op: '*', base: { major: 0, minor: 0, patch: 0, prerelease: null } };
  if (c.startsWith('^')) return { op: '^', base: parseVersion(c.slice(1)) };
  if (c.startsWith('~')) return { op: '~', base: parseVersion(c.slice(1)) };
  if (c.startsWith('>=')) return { op: '>=', base: parseVersion(c.slice(2)) };
  if (c.startsWith('<')) return { op: '<', base: parseVersion(c.slice(1)) };
  return { op: '=', base: parseVersion(c) };
}

function caretUpper(base: Version): Version {
  if (base.major > 0) return { major: base.major + 1, minor: 0, patch: 0, prerelease: null };
  if (base.minor > 0) return { major: 0, minor: base.minor + 1, patch: 0, prerelease: null };
  return { major: 0, minor: 0, patch: base.patch + 1, prerelease: null };
}

function tildeUpper(base: Version): Version {
  return { major: base.major, minor: base.minor + 1, patch: 0, prerelease: null };
}

function compareIdentifiers(a: string, b: string): number {
  const aParts = a.split('.');
  const bParts = b.split('.');
  const len = Math.max(aParts.length, bParts.length);
  for (let i = 0; i < len; i++) {
    const ai = aParts[i];
    const bi = bParts[i];
    if (ai === undefined) return -1;
    if (bi === undefined) return 1;
    const aNum = /^\d+$/.test(ai);
    const bNum = /^\d+$/.test(bi);
    if (aNum && bNum) {
      const diff = Number(ai) - Number(bi);
      if (diff !== 0) return diff > 0 ? 1 : -1;
    } else if (aNum && !bNum) {
      return -1;
    } else if (!aNum && bNum) {
      return 1;
    } else if (ai !== bi) {
      return ai > bi ? 1 : -1;
    }
  }
  return 0;
}

export function compareVersions(a: Version, b: Version): number {
  if (a.major !== b.major) return a.major > b.major ? 1 : -1;
  if (a.minor !== b.minor) return a.minor > b.minor ? 1 : -1;
  if (a.patch !== b.patch) return a.patch > b.patch ? 1 : -1;
  if (a.prerelease === null && b.prerelease === null) return 0;
  if (a.prerelease === null) return 1;
  if (b.prerelease === null) return -1;
  return compareIdentifiers(a.prerelease, b.prerelease);
}

export function versionSatisfiesComparator(v: Version, comparator: string): boolean {
  const { op, base } = splitComparator(comparator);
  switch (op) {
    case '*':
      return true;
    case '=':
      return compareVersions(v, base) === 0;
    case '>=':
      return compareVersions(v, base) >= 0;
    case '<':
      return compareVersions(v, base) < 0;
    case '^':
      return compareVersions(v, base) >= 0 && compareVersions(v, caretUpper(base)) < 0;
    case '~':
      return compareVersions(v, base) >= 0 && compareVersions(v, tildeUpper(base)) < 0;
  }
}

function clauseComparators(clause: string): { op: Op; base: Version }[] {
  return clause.trim().split(/\s+/).filter(Boolean).map(splitComparator);
}

function clauseAllowsPrerelease(comparators: { op: Op; base: Version }[], v: Version): boolean {
  if (v.prerelease === null) return true;
  return comparators.some(
    (c) => c.base.prerelease !== null && c.base.major === v.major && c.base.minor === v.minor && c.base.patch === v.patch,
  );
}

export function satisfies(version: string, range: string): boolean {
  const v = parseVersion(version);
  return range.split('||').some((rawClause) => {
    const comparators = clauseComparators(rawClause);
    if (!clauseAllowsPrerelease(comparators, v)) return false;
    const comparatorTexts = rawClause.trim().split(/\s+/).filter(Boolean);
    return comparatorTexts.every((comparatorText) => versionSatisfiesComparator(v, comparatorText));
  });
}

export function maxSatisfying(versions: string[], range: string): string | null {
  const matching = versions.filter((v) => satisfies(v, range));
  if (matching.length === 0) return null;
  return matching.reduce((best, current) => (compareVersions(parseVersion(current), parseVersion(best)) > 0 ? current : best));
}

const demoVersions = ['1.0.0', '1.2.3', '1.9.9', '2.0.0', '2.0.0-rc.1', '0.4.0', '0.4.9'];
const demoRanges = ['^1.2.3', '~1.2.3', '>=1.0.0 <2.0.0', '^0.4.0', '2.0.0-rc.1'];

export default function App() {
  return (
    <div style={{ padding: 16, fontFamily: 'monospace' }}>
      <h2>Range matching</h2>
      <table>
        <thead>
          <tr>
            <th style={{ textAlign: 'left' }}>range</th>
            <th style={{ textAlign: 'left' }}>satisfying versions</th>
            <th style={{ textAlign: 'left' }}>max</th>
          </tr>
        </thead>
        <tbody>
          {demoRanges.map((range) => {
            const hits = demoVersions.filter((v) => satisfies(v, range));
            return (
              <tr key={range}>
                <td>{range}</td>
                <td>{hits.join(', ') || '—'}</td>
                <td>{maxSatisfying(demoVersions, range) ?? '—'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
