import type { Lesson, PlannedLesson } from './types';
import { curriculum } from './curriculum';
import { getLesson } from './registry';

export type PathStop = { lessonId: string; why: string; optional?: boolean };
export type Path = { id: string; title: string; description: string; stops: PathStop[] };
export type PathStopView = { stop: PathStop; planned: PlannedLesson; lesson: Lesson | undefined };
export type PathView = { path: Path; stops: PathStopView[] };

export const paths: Path[] = [
  {
    id: 'integrate-fullstack',
    title: 'Integrate: full-stack interview path',
    description:
      'React, Go, GraphQL, PostgreSQL, GitHub Actions, and Tailwind, in the order a full-stack interview for a cross-organization project-management product tends to probe them.',
    stops: [
      { lessonId: '05-context-and-composition', why: 'Component architecture and composition are the first things a React screen probes.' },
      { lessonId: '08-concurrent-rendering', why: 'Transitions and Suspense explain how a busy project UI stays responsive.' },
      { lessonId: '09-external-stores', why: 'State management questions usually end at useSyncExternalStore and store design.' },
      { lessonId: '15-server-state-tanstack-query', why: 'Server state, caching, and optimistic updates come up in every data-heavy product.' },
      { lessonId: '54-react-performance', why: 'Large task tables and dependency views live or die on render performance.' },
      { lessonId: '18-styling-in-2026', why: 'Tailwind is in their stack; know why utility-first scales and where it does not.' },
      { lessonId: '94-css-architecture', why: 'Clean responsive interfaces without a framework crutch means owning the cascade.' },
      { lessonId: '75-graphql-fundamentals', why: 'Resolvers, schemas, and the n+1 problem are named in the posting.' },
      { lessonId: '76-graphql-operations', why: 'Fragments, variables, and pagination shape how the React side consumes the graph.' },
      { lessonId: '77-graphql-clients', why: 'Normalized caches are the mental model behind Apollo Client.' },
      { lessonId: '111-apollo-client-in-react', why: 'Apollo Client familiarity is an explicit plus.' },
      { lessonId: '102-go-for-typescript-developers', why: 'Go is the backend language; start from what carries over from TypeScript.' },
      { lessonId: '103-http-services-in-go', why: 'REST API development, middleware, and service patterns in Go are core requirements.' },
      { lessonId: '104-go-service-patterns', why: 'Cancellation, worker pools, and graceful shutdown are what senior Go screens probe.' },
      { lessonId: '105-integrations-in-go', why: 'Webhooks, third-party APIs, rate limiting, and async processing are named in the posting.' },
      { lessonId: '110-graphql-servers-in-go', why: 'Their GraphQL layer is in Go; resolvers and dataloaders tie the two tracks together.' },
      { lessonId: '106-schema-design-for-project-data', why: 'Owning data models in PostgreSQL starts with a schema for shared programs.' },
      { lessonId: '107-queries-that-answer-product-questions', why: 'Hierarchies and dependency graphs are the shape of project data.' },
      { lessonId: '108-indexes-and-explain', why: 'Query optimization is listed explicitly; EXPLAIN is the interview tool.' },
      { lessonId: '109-migrations-and-schema-evolution', why: 'Migration management on a live product is a classic follow-up.' },
      { lessonId: '52-caching-strategies', why: 'Caching is named as a broader backend concern.' },
      { lessonId: '65-cors-explained', why: 'Cross-organization products hit CORS and origin questions early.', optional: true },
      { lessonId: '69-sessions-vs-tokens', why: 'Auth across companies and vendors needs a clear sessions-vs-tokens answer.', optional: true },
      { lessonId: '92-ci-cd-with-github-actions', why: 'Writing and maintaining GitHub Actions pipelines is a listed responsibility.' },
      { lessonId: '93-release-safety', why: 'Owning what you ship means flags, rollbacks, and observability.' },
      { lessonId: '112-system-design-cross-org-collaboration', why: 'The system-design round, framed around their product.' },
      { lessonId: '113-live-coding-drills', why: 'Timed React drills on project-data UIs.' },
      { lessonId: '114-take-home-rehearsal', why: 'Rehearse the full stack end to end before a real take-home.' },
      { lessonId: '115-product-thinking-and-ownership', why: 'They want a full participant in product thinking, not an executor of specs.' },
    ],
  },
];

const plannedById = new Map(curriculum.map((p) => [p.id, p] as const));

export function getPath(id: string): Path | undefined {
  return paths.find((p) => p.id === id);
}

export function getPathView(id: string): PathView {
  const path = getPath(id);
  if (!path) throw new Error(`Unknown path '${id}'`);
  const stops: PathStopView[] = [];
  for (const stop of path.stops) {
    const planned = plannedById.get(stop.lessonId);
    if (!planned) throw new Error(`Path '${id}' references unknown lesson '${stop.lessonId}'`);
    stops.push({ stop, planned, lesson: getLesson(stop.lessonId) });
  }
  return { path, stops };
}

/** The first path that includes this lesson, with its stop note. */
export function pathStopFor(lessonId: string): { path: Path; stop: PathStop } | undefined {
  for (const path of paths) {
    const stop = path.stops.find((s) => s.lessonId === lessonId);
    if (stop) return { path, stop };
  }
  return undefined;
}
