export type FrontmatterValue = string | number | boolean | Date | string[];
export type Frontmatter = Record<string, FrontmatterValue>;

export type ParsedFile = { data: Frontmatter; content: string };

// TODO: classify one scalar frontmatter value (already trimmed of surrounding
// whitespace, but not of quotes).
// 'true' / 'false'        -> boolean
// '"quoted"' or "'quoted'" -> the string inside the quotes
// '42' or '3.5'            -> number
// '2026-01-15'             -> Date (new Date(trimmed) parses a date-only ISO string as UTC midnight)
// anything else            -> the trimmed string, unchanged
function parseScalar(raw: string): FrontmatterValue {
  return raw.trim();
}

export function parseFrontmatter(text: string): ParsedFile {
  const lines = text.split('\n');
  if (lines[0]?.trim() !== '---') return { data: {}, content: text.trimStart() };

  let closeIndex = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i]?.trim() === '---') {
      closeIndex = i;
      break;
    }
  }
  if (closeIndex === -1) return { data: {}, content: text.trimStart() };

  const fmLines = lines.slice(1, closeIndex);
  const content = lines.slice(closeIndex + 1).join('\n').trimStart();

  const data: Frontmatter = {};

  // TODO: walk fmLines and fill `data`. Each line matches /^(\w+):\s*(.*)$/ giving
  // a key and the rest of the line.
  // - If `rest` is empty, this is a *block array*: consume following lines matching
  //   /^\s*-\s+(.*)$/ (via parseScalar, coerced to string) until one doesn't match;
  //   store the collected items as a string[], and skip past the lines you consumed.
  // - If `rest` looks like "[a, b, c]", split the inside on commas and parseScalar
  //   each piece (coerced to string) into a string[].
  // - Otherwise, `data[key] = parseScalar(rest)`.

  return { data, content };
}

export type FieldType = 'string' | 'date' | 'string[]' | 'boolean' | 'number';
export type SchemaField = { type: FieldType; required?: boolean };
export type Schema = Record<string, SchemaField>;

export type CollectionEntry = {
  slug: string;
  data: Frontmatter;
  content: string;
  file: string;
};

export type CollectionError = { file: string; message: string };

export type CollectionResult = { entries: CollectionEntry[]; errors: CollectionError[] };

// TODO: does `value` match `type`? 'date' means "is a valid Date instance"
// (`value instanceof Date && !Number.isNaN(value.getTime())`); 'string[]' means
// "an array where every element is a string"; the rest are plain typeof checks.
function matchesType(value: FrontmatterValue, type: FieldType): boolean {
  return true;
}

function kebabSlug(filename: string): string {
  const base = filename.replace(/\.(md|mdx)$/i, '');
  return base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function buildCollection(files: { filename: string; text: string }[], schema: Schema): CollectionResult {
  const entries: CollectionEntry[] = [];
  const errors: CollectionError[] = [];

  for (const file of files) {
    const parsed = parseFrontmatter(file.text);
    let invalid: string | null = null;

    for (const [key, field] of Object.entries(schema)) {
      const value = parsed.data[key];
      if (value === undefined) {
        if (field.required) {
          invalid = `missing required field "${key}"`;
          break;
        }
        continue;
      }
      if (!matchesType(value, field.type)) {
        invalid = `field "${key}" expected ${field.type}`;
        break;
      }
    }

    if (invalid) {
      errors.push({ file: file.filename, message: invalid });
      continue;
    }

    const slugOverride = parsed.data.slug;
    const slug = typeof slugOverride === 'string' && slugOverride.length > 0 ? slugOverride : kebabSlug(file.filename);

    entries.push({ slug, data: parsed.data, content: parsed.content, file: file.filename });
  }

  return { entries, errors };
}

export type Page<T> = {
  items: T[];
  pageNumber: number;
  prevUrl: string | null;
  nextUrl: string | null;
};

function pageUrl(pageNumber: number): string {
  return pageNumber === 1 ? '/' : `/page/${pageNumber}`;
}

// TODO: split `entries` into pages of `perPage` items each. `pageNumber` is 1-based.
// `prevUrl`/`nextUrl` come from `pageUrl`, and are `null` at the first/last page
// respectively. Empty input (or perPage <= 0) produces an empty array.
export function paginate<T>(entries: T[], perPage: number): Page<T>[] {
  return [];
}

const sampleFiles = [
  {
    filename: 'hello-world.md',
    text: '---\ntitle: Hello World\npublishedAt: 2026-01-15\ntags: [react, ssg]\n---\n# Hi\n',
  },
  {
    filename: 'second-post.md',
    text: '---\ntitle: Second Post\npublishedAt: 2026-02-01\ntags:\n  - astro\n  - eleventy\n---\nBody text.\n',
  },
  {
    filename: 'broken.md',
    text: '---\ntitle: Missing date\n---\nNo publishedAt here.\n',
  },
];

const sampleSchema: Schema = {
  title: { type: 'string', required: true },
  publishedAt: { type: 'date', required: true },
  tags: { type: 'string[]' },
};

export default function App() {
  const { entries, errors } = buildCollection(sampleFiles, sampleSchema);
  const pages = paginate(entries, 1);

  return (
    <div style={{ padding: 16, fontFamily: 'monospace' }}>
      <h2>{entries.length} valid entries, {errors.length} error(s)</h2>
      <ul>
        {entries.map((e) => (
          <li key={e.slug}>
            /{e.slug} — {String(e.data.title)} ({(e.data.tags as string[] | undefined)?.join(', ') ?? 'no tags'})
          </li>
        ))}
      </ul>
      <h3>Errors</h3>
      <ul>
        {errors.map((e) => (
          <li key={e.file}>{e.file}: {e.message}</li>
        ))}
      </ul>
      <h3>Pagination ({pages.length} pages)</h3>
      <ul>
        {pages.map((p) => (
          <li key={p.pageNumber}>
            page {p.pageNumber}: prev={p.prevUrl ?? 'none'}, next={p.nextUrl ?? 'none'}
          </li>
        ))}
      </ul>
    </div>
  );
}
