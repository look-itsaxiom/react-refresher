import { Link, isRouteErrorResponse, useRouteError } from 'react-router';
import { buttonClassName } from './components/Button';

function messageFor(error: unknown): string {
  if (isRouteErrorResponse(error)) return `${error.status} ${error.statusText}`;
  if (error instanceof Error) return error.message;
  return String(error);
}

export function RouteError() {
  const error = useRouteError();
  return (
    <div className="min-h-full flex items-center justify-center p-6">
      <div role="alert" className="max-w-md w-full rounded-lg border border-border bg-surface-2 p-6 text-center space-y-4">
        <h1 className="text-lg font-semibold">Something went wrong</h1>
        <p className="text-sm text-ink-muted">{messageFor(error)}</p>
        <Link to="/" className={buttonClassName()}>
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
