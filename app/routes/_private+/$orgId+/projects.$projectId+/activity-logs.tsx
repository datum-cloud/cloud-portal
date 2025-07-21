import { ActivityLogList } from '@/features/activity-log/list';
import { getSession } from '@/modules/cookie/session.server';
import { LokiActivityLogsService } from '@/modules/loki';
import { data, type LoaderFunctionArgs } from 'react-router';
import { useLoaderData } from 'react-router';

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  try {
    // Get session for authentication
    const sessionResponse = await getSession(request);
    const session = sessionResponse.session;

    if (!session?.accessToken) {
      throw new Response('Unauthorized', { status: 401 });
    }

    // Get project ID from params
    const projectId = params.projectId;

    // Create service and fetch logs
    const service = new LokiActivityLogsService(session.accessToken);
    const logs = await service.getActivityLogs({
      project: projectId,
      start: '7d',
      limit: '100',
    });

    return data(logs);
  } catch (error) {
    console.error('Error loading activity logs:', error);
    return data({
      success: false,
      message: error instanceof Error ? error.message : 'Error loading activity logs',
      logs: [],
    });
  }
};

export default function ProjectActivityLogsPage() {
  const response = useLoaderData<typeof loader>();
  // Extract logs from the response
  const logs = response.logs || [];

  console.log({ logs });
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <ActivityLogList logs={logs} />
    </div>
  );
}
