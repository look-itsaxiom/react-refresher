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

// TODO: -1 if a < b, 0 if equal, 1 if a > b. See prompt.md for the prerelease rules.
export function compareVersions(a: Version, b: Version): number {
  return 0;
}

// TODO: does `v` satisfy this single comparator's numeric range?
// Use splitComparator(comparator) to get { op, base }, then compareVersions.
export function versionSatisfiesComparator(v: Version, comparator: string): boolean {
  return false;
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
