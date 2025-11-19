import { ActivityLogList } from '@/features/activity-log/list';
import { useParams } from 'react-router';

export const handle = {
  breadcrumb: () => <span>Activity</span>,
};

export default function ProjectActivityLogsPage() {
  const { projectId } = useParams();

  return <ActivityLogList params={{ project: projectId }} />;
}
