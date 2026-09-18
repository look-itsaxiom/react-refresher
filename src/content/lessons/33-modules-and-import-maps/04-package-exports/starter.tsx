export type ExportsTarget = string | null | { [condition: string]: ExportsTarget };

export type PackageJson = {
  name?: string;
  exports?: ExportsTarget | Record<string, ExportsTarget>;
};

// TODO: implement per prompt.md.
export function resolvePackageExports(pkg: PackageJson, subpath: string, conditions: string[]): string {
  throw new Error('not implemented');
}

// TODO: implement per prompt.md.
export function hazardCheck(pkg: PackageJson): boolean {
  return false;
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
