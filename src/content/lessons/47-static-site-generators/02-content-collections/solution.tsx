export type FrontmatterValue = string | number | boolean | Date | string[];
export type Frontmatter = Record<string, FrontmatterValue>;

export type ParsedFile = { data: Frontmatter; content: string };

function parseScalar(raw: string): FrontmatterValue {
  const trimmed = raw.trim();
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;

  const quoted = trimmed.match(/^"(.*)"$|^'(.*)'$/);
  if (quoted) return (quoted[1] ?? quoted[2] ?? '') as string;

  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return new Date(trimmed);

  return trimmed;
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
  let i = 0;
  while (i < fmLines.length) {
    const line = fmLines[i] ?? '';
    const match = line.match(/^(\w+):\s*(.*)$/);
    if (!match) {
      i++;
      continue;
    }
    const key = match[1]!;
    const rest = (match[2] ?? '').trim();

    if (rest === '') {
      // possible block array: subsequent lines of the form "  - item"
      const items: string[] = [];
      let j = i + 1;
      while (j < fmLines.length) {
        const itemMatch = fmLines[j]?.match(/^\s*-\s+(.*)$/);
        if (!itemMatch) break;
        const parsedItem = parseScalar(itemMatch[1] ?? '');
        items.push(String(parsedItem));
        j++;
      }
      data[key] = items;
      i = j;
    } else if (rest.startsWith('[') && rest.endsWith(']')) {
      const inner = rest.slice(1, -1).trim();
      const items = inner === '' ? [] : inner.split(',').map((part) => String(parseScalar(part.trim())));
      data[key] = items;
      i++;
    } else {
      data[key] = parseScalar(rest);
      i++;
    }
  }

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

function matchesType(value: FrontmatterValue, type: FieldType): boolean {
  switch (type) {
    case 'string':
      return typeof value === 'string';
    case 'number':
      return typeof value === 'number';
    case 'boolean':
      return typeof value === 'boolean';
    case 'date':
      return value instanceof Date && !Number.isNaN(value.getTime());
    case 'string[]':
      return Array.isArray(value) && value.every((v) => typeof v === 'string');
  }
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

export function paginate<T>(entries: T[], perPage: number): Page<T>[] {
  if (entries.length === 0 || perPage <= 0) return [];

  const totalPages = Math.ceil(entries.length / perPage);
  const pages: Page<T>[] = [];

  for (let pageNumber = 1; pageNumber <= totalPages; pageNumber++) {
    const start = (pageNumber - 1) * perPage;
    pages.push({
      items: entries.slice(start, start + perPage),
      pageNumber,
      prevUrl: pageNumber === 1 ? null : pageUrl(pageNumber - 1),
      nextUrl: pageNumber === totalPages ? null : pageUrl(pageNumber + 1),
    });
  }

  return pages;
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
