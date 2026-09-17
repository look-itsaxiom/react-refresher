import { useParams } from 'react-router';
export function LessonPage() {
  const { lessonId } = useParams();
  return <p className="p-6">Lesson {lessonId} coming in Task 9.</p>;
}
