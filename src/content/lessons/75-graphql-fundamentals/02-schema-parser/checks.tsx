import type { Check } from '../../../types';

type TypeRef =
  | { kind: 'named'; name: string; nonNull: boolean }
  | { kind: 'list'; of: TypeRef; nonNull: boolean };

type FieldDef = { type: TypeRef; args: Record<string, TypeRef>; deprecated?: string };

type TypeDef =
  | { kind: 'scalar'; name: string }
  | { kind: 'enum'; name: string; values: string[] }
  | { kind: 'union'; name: string; members: string[] }
  | { kind: 'interface'; name: string; fields: Record<string, FieldDef> }
  | { kind: 'object'; name: string; implements: string[]; fields: Record<string, FieldDef> }
  | { kind: 'input'; name: string; fields: Record<string, FieldDef> };

type Schema = { types: Record<string, TypeDef>; query: string; mutation?: string };

const validSdl = `
enum Role {
  ADMIN
  MEMBER
}

interface Node {
  id: ID!
}

type User implements Node {
  id: ID!
  name: String!
  posts: [Post!]!
}

type Post implements Node {
  id: ID!
  title: String!
  author: User!
}

union SearchResult = User | Post

input UserFilter {
  role: Role
}

type Query {
  user(id: ID!): User
  users(filter: UserFilter): [User!]!
}
`;

export const checks: Check[] = [
  {
    name: 'parseSdl: builds object, interface, enum, union, and input types with correct nullability, list wrapping, implements, and deprecation',
    run: async ({ mod, expect }) => {
      const parseSdl = mod.parseSdl as (sdl: string) => Schema;
      const sdl = `
        enum Role { ADMIN MEMBER }
        interface Node { id: ID! }
        type User implements Node {
          id: ID!
          name: String!
          email: String
          posts(limit: Int): [Post!]!
        }
        type Post implements Node {
          id: ID!
          status: String! @deprecated(reason: "use state instead")
        }
        union SearchResult = User | Post
        input UserFilter { role: Role }
        type Query { user(id: ID!): User }
      `;
      const schema = parseSdl(sdl);

      expect(schema.query).to.equal('Query');
      expect(schema.mutation).to.equal(undefined);

      const role = schema.types['Role'];
      expect(role?.kind).to.equal('enum');
      if (role?.kind === 'enum') expect(role.values).to.deep.equal(['ADMIN', 'MEMBER']);

      const user = schema.types['User'];
      expect(user?.kind).to.equal('object');
      if (user?.kind === 'object') {
        expect(user.implements).to.deep.equal(['Node']);
        const email = user.fields['email']!.type;
        expect(email).to.deep.equal({ kind: 'named', name: 'String', nonNull: false });
        const posts = user.fields['posts']!.type;
        expect(posts).to.deep.equal({
          kind: 'list',
          nonNull: true,
          of: { kind: 'named', name: 'Post', nonNull: true },
        });
        expect(user.fields['posts']!.args['limit']).to.deep.equal({
          kind: 'named',
          name: 'Int',
          nonNull: false,
        });
      }

      const post = schema.types['Post'];
      if (post?.kind === 'object') {
        expect(post.fields['status']!.deprecated).to.equal('use state instead');
      }

      const search = schema.types['SearchResult'];
      expect(search?.kind).to.equal('union');
      if (search?.kind === 'union') expect(search.members).to.deep.equal(['User', 'Post']);

      const filter = schema.types['UserFilter'];
      expect(filter?.kind).to.equal('input');
    },
  },
  {
    name: 'parseSdl: a schema with a Mutation type reports it as schema.mutation',
    run: async ({ mod, expect }) => {
      const parseSdl = mod.parseSdl as (sdl: string) => Schema;
      const schema = parseSdl(`
        type Query { ping: String }
        type Mutation { createUser(name: String!): String }
      `);
      expect(schema.mutation).to.equal('Mutation');
    },
  },
  {
    name: 'validateSchema: a schema missing Query reports exactly one error and stops there',
    run: async ({ mod, expect }) => {
      const parseSdl = mod.parseSdl as (sdl: string) => Schema;
      const validateSchema = mod.validateSchema as (schema: Schema) => string[];
      const schema = parseSdl(`type User { id: ID! }`);
      const errors = validateSchema(schema);
      expect(errors).to.have.lengthOf(1);
      expect(errors[0]!.toLowerCase()).to.include('query');
    },
  },
  {
    name: 'validateSchema: a field referencing an undeclared type is reported, and a fully valid schema reports nothing',
    run: async ({ mod, expect }) => {
      const parseSdl = mod.parseSdl as (sdl: string) => Schema;
      const validateSchema = mod.validateSchema as (schema: Schema) => string[];

      const broken = parseSdl(`
        type Query { user: User }
        type User {
          id: ID!
          avatar: Image
        }
      `);
      const brokenErrors = validateSchema(broken);
      expect(brokenErrors.some((e) => e.includes('Image'))).to.equal(true);

      const validErrors = validateSchema(parseSdl(validSdl));
      expect(validErrors).to.deep.equal([]);
    },
  },
  {
    name: 'validateSchema: an object missing an interface field, and a union with a non-object member, are both reported',
    run: async ({ mod, expect }) => {
      const parseSdl = mod.parseSdl as (sdl: string) => Schema;
      const validateSchema = mod.validateSchema as (schema: Schema) => string[];

      const missingField = parseSdl(`
        type Query { node: Node }
        interface Node {
          id: ID!
          name: String!
        }
        type User implements Node { id: ID! }
      `);
      const missingFieldErrors = validateSchema(missingField);
      expect(missingFieldErrors.some((e) => e.includes('User') && e.includes('name'))).to.equal(true);

      const badUnion = parseSdl(`
        type Query { search: Result }
        enum Result { A B }
        union Wrapper = Result
      `);
      const badUnionErrors = validateSchema(badUnion);
      expect(badUnionErrors.some((e) => e.includes('Wrapper') && e.includes('Result'))).to.equal(true);
    },
  },
];
