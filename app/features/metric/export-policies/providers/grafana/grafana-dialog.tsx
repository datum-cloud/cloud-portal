import { GrafanaForm } from './grafana-form';
import type { GrafanaDialogProps } from './grafana.types';
import { Dialog } from '@datum-ui/components/dialog';

export function GrafanaDialog({ projectId, open, onOpenChange }: GrafanaDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <Dialog.Content className="w-full sm:max-w-[774px]">
        <GrafanaForm projectId={projectId} onClose={() => onOpenChange(false)} />
      </Dialog.Content>
    </Dialog>
  );
}
