import { ActivityLogTable } from '@/features/activity-log';
import { useParams } from 'react-router';

export const handle = {
  breadcrumb: () => <span>Activity</span>,
};

export default function ProjectActivityLogsPage() {
  const { projectId } = useParams();

  return <ActivityLogTable scope={{ type: 'project', projectId: projectId! }} />;
}
