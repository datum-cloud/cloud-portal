import { GrafanaForm } from './grafana-form';
import type { GrafanaDialogProps } from './grafana.types';
import { BadgeCopy } from '@/components/badge/badge-copy';
import { IExportPolicyControlResponse } from '@/resources/export-policies';
import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { LinkButton } from '@datum-ui/components';
import { Dialog } from '@datum-ui/components/dialog';
import { useState } from 'react';

export function GrafanaDialog({ projectId, open, onOpenChange }: GrafanaDialogProps) {
  const [success, setSuccess] = useState(false);
  const [exportPolicy, setExportPolicy] = useState<IExportPolicyControlResponse | null>(null);
  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        onOpenChange(open);
        if (!open) {
          setSuccess(false);
          setExportPolicy(null);
        }
      }}>
      {!success ? (
        <Dialog.Content className="w-full sm:max-w-[774px]">
          <GrafanaForm
            projectId={projectId}
            onClose={() => onOpenChange(false)}
            onSuccess={({ exportPolicy }) => {
              setSuccess(true);
              setExportPolicy(exportPolicy);
            }}
          />
        </Dialog.Content>
      ) : (
        <Dialog.Content className="flex w-full flex-col items-center justify-center gap-10 p-10 sm:max-w-[423px] [&>button:last-child]:block">
          <img src="/images/scene-8.png" alt="Export to Grafana Cloud" className="h-auto w-full" />

          <div className="flex w-full flex-col items-center gap-3.5">
            <h4 className="text-xl font-medium">Export Policy Created</h4>
            <BadgeCopy
              value={exportPolicy?.name ?? ''}
              text={exportPolicy?.name ?? ''}
              badgeType="muted"
              badgeTheme="solid"
              className="py-0 font-mono text-nowrap"
            />
            <p className="text-center text-sm">
              Your <strong className="font-semibold">Export to Grafana Cloud</strong> policy is now
              set up. Metrics will start flowing automatically.
            </p>
          </div>

          <LinkButton
            to={getPathWithParams(paths.project.detail.metrics.exportPolicies.root, {
              projectId,
            })}
            type="primary"
            theme="solid"
            size="small"
            className="w-fit text-xs font-semibold">
            Your export policies
          </LinkButton>
        </Dialog.Content>
      )}
    </Dialog>
  );
}
