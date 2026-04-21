import { Button } from '@datum-cloud/datum-ui/button';
import { Card, CardContent } from '@datum-cloud/datum-ui/card';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { TriangleAlertIcon } from 'lucide-react';

export const DangerCard = ({
  title = 'Warning: This Action is Irreversible',
  description = 'This action cannot be undone. Once deleted, the resource and all associated data will be permanently removed.',
  deleteText = 'Delete',
  loading = false,
  disabled = false,
  onDelete,
  'data-e2e': dataE2e,
}: {
  title?: string;
  description?: string | React.ReactNode;
  deleteText?: string;
  loading?: boolean;
  disabled?: boolean;
  onDelete: () => void;
  'data-e2e'?: string;
}) => {
  const isDisabled = loading || disabled;
  return (
    <Card className="border-destructive overflow-hidden rounded-xl px-3 py-4 shadow-none sm:pt-6 sm:pb-4">
      <CardContent className="flex flex-col items-end justify-between gap-4 p-0 sm:px-6 sm:pb-4 md:flex-row md:items-center md:justify-between md:gap-2">
        <div className="flex items-center gap-8">
          <Icon
            icon={TriangleAlertIcon}
            size={34}
            className="text-destructive hidden self-start stroke-1 sm:block"
          />
          <div className="text-destructive flex max-w-xl flex-col gap-2">
            <span className="text-sm font-semibold">{title}</span>
            <span className="text-1xs leading-relaxed font-normal">{description}</span>
          </div>
        </div>
        <div className="flex w-full justify-end md:w-auto">
          <Button
            htmlType="button"
            type="danger"
            theme="solid"
            size="xs"
            className="w-full md:w-auto"
            data-e2e={dataE2e}
            disabled={isDisabled}
            loading={loading}
            onClick={onDelete}>
            {loading ? 'Deleting...' : deleteText}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
