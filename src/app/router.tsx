import { createBrowserRouter } from 'react-router';
import { Layout } from './Layout';
import { Dashboard } from './Dashboard';
import { LessonPage } from './LessonPage';
import { RouteError } from './RouteError';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: Layout,
    errorElement: <RouteError />,
    children: [
      { index: true, Component: Dashboard },
      { path: 'lesson/:lessonId/:stepIndex?', Component: LessonPage },
    ],
  },
]);
