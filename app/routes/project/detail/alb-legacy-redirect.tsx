import { redirect, type LoaderFunctionArgs } from 'react-router';

/**
 * Permanent redirect from legacy `/project/:projectId/edge/*` paths to `/alb/*`.
 * Preserves the remaining path suffix and query string.
 */
export async function loader({ request, params }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const projectId = params.projectId ?? '';
  const destination =
    url.pathname.replace(`/project/${projectId}/edge`, `/project/${projectId}/alb`) + url.search;
  return redirect(destination, 308);
}
