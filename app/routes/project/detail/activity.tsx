import { ActivityLogList } from '@/features/activity-log/list';
import { useParams } from 'react-router';

export default function ProjectActivityLogsPage() {
  const { projectId } = useParams();

  return <ActivityLogList params={{ project: projectId }} title="Activity" className="max-w-3xl" />;
}
