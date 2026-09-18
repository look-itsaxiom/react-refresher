export type ExportsTarget = string | null | { [condition: string]: ExportsTarget };

export type PackageJson = {
  name?: string;
  exports?: ExportsTarget | Record<string, ExportsTarget>;
};

/** Resolves one target value once a subpath has matched (with an optional pattern
 * capture for `*` substitution). Returns the resolved string, `null` for an explicit
 * block, or `undefined` if a conditions object matched none of the requested conditions. */
function resolveTarget(target: ExportsTarget, conditions: string[], starMatch: string | null): string | null | undefined {
  if (target === null) return null;
  if (typeof target === 'string') {
    return starMatch !== null ? target.split('*').join(starMatch) : target;
  }
  for (const key of Object.keys(target)) {
    if (key === 'default' || conditions.includes(key)) {
      const resolved = resolveTarget(target[key]!, conditions, starMatch);
      if (resolved !== undefined) return resolved;
    }
  }
  return undefined;
}

function isSubpathMapShape(exportsField: object): boolean {
  const keys = Object.keys(exportsField);
  const dotKeys = keys.filter((k) => k.startsWith('.'));
  if (dotKeys.length === 0) return false;
  if (dotKeys.length === keys.length) return true;
  throw new Error('Invalid "exports" field: cannot mix subpath keys (starting with ".") and condition keys.');
}

export function resolvePackageExports(pkg: PackageJson, subpath: string, conditions: string[]): string {
  const exportsField = pkg.exports;
  if (exportsField === undefined) {
    throw new Error(`Package "${pkg.name ?? '(unknown)'}" has no "exports" field.`);
  }

  let subpathMap: Record<string, ExportsTarget>;
  if (typeof exportsField !== 'object' || exportsField === null) {
    // string shorthand: only "." is valid
    subpathMap = { '.': exportsField as ExportsTarget };
  } else if (isSubpathMapShape(exportsField)) {
    subpathMap = exportsField as Record<string, ExportsTarget>;
  } else {
    subpathMap = { '.': exportsField as ExportsTarget };
  }

  if (subpath in subpathMap) {
    const resolved = resolveTarget(subpathMap[subpath]!, conditions, null);
    if (resolved === null) {
      throw new Error(`Subpath "${subpath}" is blocked (exports to null).`);
    }
    if (resolved === undefined) {
      throw new Error(`No matching condition for "${subpath}" among [${conditions.join(', ')}].`);
    }
    return resolved;
  }

  let bestKey: string | undefined;
  let bestStar: string | undefined;
  for (const key of Object.keys(subpathMap)) {
    const starIndex = key.indexOf('*');
    if (starIndex === -1) continue;
    const prefix = key.slice(0, starIndex);
    const suffix = key.slice(starIndex + 1);
    if (subpath.startsWith(prefix) && subpath.endsWith(suffix) && subpath.length >= prefix.length + suffix.length) {
      const currentPrefixLength = bestKey ? bestKey.indexOf('*') : -1;
      if (bestKey === undefined || prefix.length > currentPrefixLength) {
        bestKey = key;
        bestStar = subpath.slice(prefix.length, subpath.length - suffix.length);
      }
    }
  }

  if (bestKey !== undefined && bestStar !== undefined) {
    const resolved = resolveTarget(subpathMap[bestKey]!, conditions, bestStar);
    if (resolved === null) {
      throw new Error(`Subpath "${subpath}" is blocked (exports to null).`);
    }
    if (resolved === undefined) {
      throw new Error(`No matching condition for "${subpath}" among [${conditions.join(', ')}].`);
    }
    return resolved;
  }

  throw new Error(`Subpath "${subpath}" is not exported by this package.`);
}

export function hazardCheck(pkg: PackageJson): boolean {
  let importTarget: string;
  let requireTarget: string;
  try {
    importTarget = resolvePackageExports(pkg, '.', ['import']);
    requireTarget = resolvePackageExports(pkg, '.', ['require']);
  } catch {
    return false;
  }
  return importTarget !== requireTarget;
}

const samplePkg: PackageJson = {
  name: 'sample-lib',
  exports: {
    '.': {
      types: './dist/index.d.ts',
      import: './dist/index.mjs',
      require: './dist/index.cjs',
    },
    './features/*': {
      import: './dist/features/*.mjs',
      require: './dist/features/*.cjs',
    },
  },
};

export default function App() {
  let mainImport: string;
  let mainRequire: string;
  let feature: string;
  let hazard: boolean;
  try {
    mainImport = resolvePackageExports(samplePkg, '.', ['import']);
    mainRequire = resolvePackageExports(samplePkg, '.', ['require']);
    feature = resolvePackageExports(samplePkg, './features/charts', ['import']);
    hazard = hazardCheck(samplePkg);
  } catch (err) {
    mainImport = mainRequire = feature = `error: ${(err as Error).message}`;
    hazard = false;
  }
  return (
    <ul>
      <li>main (import): {mainImport}</li>
      <li>main (require): {mainRequire}</li>
      <li>./features/charts (import): {feature}</li>
      <li>dual-package hazard: {String(hazard)}</li>
    </ul>
  );
}
