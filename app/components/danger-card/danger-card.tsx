import { Button, Card, CardContent } from '@datum-ui/components';
import { TriangleAlertIcon } from 'lucide-react';

export const DangerCard = ({
  title = 'Warning: This Action is Irreversible',
  description = 'This action cannot be undone. Once deleted, the resource and all associated data will be permanently removed.',
  deleteText = 'Delete',
  loading = false,
  onDelete,
}: {
  title?: string;
  description?: string | React.ReactNode;
  deleteText?: string;
  loading?: boolean;
  onDelete: () => void;
}) => {
  return (
    <Card className="border-destructive rounded-xl py-5">
      <CardContent className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-8">
          <TriangleAlertIcon size={34} className="text-destructive stroke-1" />
          <div className="text-destructive flex max-w-md flex-col gap-2">
            <span className="text-sm font-semibold">{title}</span>
            <span className="text-xs leading-relaxed font-normal">{description}</span>
          </div>
        </div>
        <div className="flex justify-end">
          <Button
            htmlType="button"
            type="danger"
            theme="solid"
            size="xs"
            disabled={loading}
            loading={loading}
            onClick={onDelete}>
            {loading ? 'Deleting...' : deleteText}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
