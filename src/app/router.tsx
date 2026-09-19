import { createBrowserRouter } from 'react-router';
import { Layout } from './Layout';
import { Dashboard } from './Dashboard';
import { LessonPage } from './LessonPage';
import { RouteError } from './RouteError';

// BASE_URL is '/' in dev and '/react-refresher/' in the GitHub Pages build (vite `base`).
const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || '/';

export const router = createBrowserRouter(
  [
    {
      path: '/',
      Component: Layout,
      errorElement: <RouteError />,
      children: [
        { index: true, Component: Dashboard },
        { path: 'lesson/:lessonId/:stepIndex?', Component: LessonPage },
      ],
    },
  ],
  { basename },
);
