import { createBrowserRouter } from 'react-router';
import { Layout } from './Layout';
import { Dashboard } from './Dashboard';
import { LessonPage } from './LessonPage';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: Layout,
    children: [
      { index: true, Component: Dashboard },
      { path: 'lesson/:lessonId/:stepIndex?', Component: LessonPage },
    ],
  },
]);
