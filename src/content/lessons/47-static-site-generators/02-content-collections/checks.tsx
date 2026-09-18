import type { Check } from '../../../types';

type Schema = Record<string, { type: 'string' | 'date' | 'string[]' | 'boolean' | 'number'; required?: boolean }>;
type Frontmatter = Record<string, unknown>;
type ParsedFile = { data: Frontmatter; content: string };
type CollectionEntry = { slug: string; data: Frontmatter; content: string; file: string };
type CollectionResult = { entries: CollectionEntry[]; errors: { file: string; message: string }[] };
type Page<T> = { items: T[]; pageNumber: number; prevUrl: string | null; nextUrl: string | null };

const files = [
  {
    filename: 'hello-world.md',
    text: '---\ntitle: Hello World\npublishedAt: 2026-01-15\ntags: [react, ssg]\npublished: true\n---\n# Hi\nBody one.\n',
  },
  {
    filename: 'Second Post.md',
    text: '---\ntitle: Second Post\npublishedAt: 2026-02-01\ntags:\n  - astro\n  - eleventy\n---\nBody two.\n',
  },
  {
    filename: 'custom-slug.md',
    text: '---\ntitle: Custom Slug Post\nslug: my-custom-slug\npublishedAt: 2026-03-01\n---\nBody three.\n',
  },
  {
    filename: 'broken.md',
    text: '---\ntitle: Missing date\n---\nNo publishedAt here.\n',
  },
  {
    filename: 'wrong-type.md',
    text: '---\ntitle: Wrong Type\npublishedAt: not-a-date\n---\nBad date value.\n',
  },
];

const schema: Schema = {
  title: { type: 'string', required: true },
  publishedAt: { type: 'date', required: true },
  tags: { type: 'string[]' },
  published: { type: 'boolean' },
};

export const checks: Check[] = [
  {
    name: 'parseFrontmatter: scalars (string, number, boolean, date) are typed correctly',
    run: async ({ mod, expect }) => {
      const parseFrontmatter = mod.parseFrontmatter as (text: string) => ParsedFile;
      const result = parseFrontmatter(
        '---\ntitle: Hello World\nviews: 42\npublished: true\npublishedAt: 2026-01-15\n---\nBody text.\n',
      );
      expect(result.data.title).to.equal('Hello World');
      expect(result.data.views).to.equal(42);
      expect(result.data.published).to.equal(true);
      expect(result.data.publishedAt).to.be.instanceOf(Date);
      expect((result.data.publishedAt as Date).toISOString().slice(0, 10)).to.equal('2026-01-15');
      expect(result.content).to.equal('Body text.\n');
    },
  },
  {
    name: 'parseFrontmatter: quoted strings and inline arrays parse correctly',
    run: async ({ mod, expect }) => {
      const parseFrontmatter = mod.parseFrontmatter as (text: string) => ParsedFile;
      const result = parseFrontmatter('---\ntitle: "Quoted: Title"\ntags: [react, ssg, mdx]\n---\nContent.\n');
      expect(result.data.title).to.equal('Quoted: Title');
      expect(result.data.tags).to.deep.equal(['react', 'ssg', 'mdx']);
    },
  },
  {
    name: 'parseFrontmatter: block-style arrays (leading "- item" lines) parse correctly',
    run: async ({ mod, expect }) => {
      const parseFrontmatter = mod.parseFrontmatter as (text: string) => ParsedFile;
      const result = parseFrontmatter(
        '---\ntitle: Block Array\ntags:\n  - astro\n  - eleventy\n  - docusaurus\nauthor: Ada\n---\nContent.\n',
      );
      expect(result.data.tags).to.deep.equal(['astro', 'eleventy', 'docusaurus']);
      // a plain scalar line immediately after a block array must still parse correctly,
      // proving the loop advanced its index past the consumed array lines
      expect(result.data.author).to.equal('Ada');
    },
  },
  {
    name: 'buildCollection: valid files become entries with generated, kebab-cased slugs',
    run: async ({ mod, expect }) => {
      const buildCollection = mod.buildCollection as (
        files: { filename: string; text: string }[],
        schema: Schema,
      ) => CollectionResult;
      const { entries } = buildCollection(files, schema);
      const hello = entries.find((e) => e.file === 'hello-world.md');
      const second = entries.find((e) => e.file === 'Second Post.md');
      expect(hello?.slug).to.equal('hello-world');
      expect(second?.slug).to.equal('second-post');
    },
  },
  {
    name: 'buildCollection: a frontmatter `slug` field overrides the filename-derived slug',
    run: async ({ mod, expect }) => {
      const buildCollection = mod.buildCollection as (
        files: { filename: string; text: string }[],
        schema: Schema,
      ) => CollectionResult;
      const { entries } = buildCollection(files, schema);
      const custom = entries.find((e) => e.file === 'custom-slug.md');
      expect(custom?.slug).to.equal('my-custom-slug');
    },
  },
  {
    name: 'buildCollection: a missing required field or a wrong-typed field becomes an error, not an entry',
    run: async ({ mod, expect }) => {
      const buildCollection = mod.buildCollection as (
        files: { filename: string; text: string }[],
        schema: Schema,
      ) => CollectionResult;
      const { entries, errors } = buildCollection(files, schema);
      expect(entries.find((e) => e.file === 'broken.md')).to.equal(undefined);
      expect(entries.find((e) => e.file === 'wrong-type.md')).to.equal(undefined);
      expect(errors.map((e) => e.file)).to.include('broken.md');
      expect(errors.map((e) => e.file)).to.include('wrong-type.md');
      // exactly the two invalid files produced errors, no false positives
      expect(errors).to.have.lengthOf(2);
      expect(entries).to.have.lengthOf(3);
    },
  },
  {
    name: 'paginate: splits items into pages with correct prev/next URLs at the edges',
    run: async ({ mod, expect }) => {
      const paginate = mod.paginate as <T>(entries: T[], perPage: number) => Page<T>[];
      const items = ['a', 'b', 'c', 'd', 'e'];
      const pages = paginate(items, 2);
      expect(pages).to.have.lengthOf(3);
      expect(pages[0]?.items).to.deep.equal(['a', 'b']);
      expect(pages[0]?.prevUrl).to.equal(null);
      expect(pages[0]?.nextUrl).to.equal('/page/2');
      expect(pages[1]?.items).to.deep.equal(['c', 'd']);
      expect(pages[1]?.prevUrl).to.equal('/');
      expect(pages[1]?.nextUrl).to.equal('/page/3');
      expect(pages[2]?.items).to.deep.equal(['e']);
      expect(pages[2]?.prevUrl).to.equal('/page/2');
      expect(pages[2]?.nextUrl).to.equal(null);
    },
  },
  {
    name: 'paginate: empty input produces no pages',
    run: async ({ mod, expect }) => {
      const paginate = mod.paginate as <T>(entries: T[], perPage: number) => Page<T>[];
      expect(paginate([], 10)).to.deep.equal([]);
    },
  },
];
