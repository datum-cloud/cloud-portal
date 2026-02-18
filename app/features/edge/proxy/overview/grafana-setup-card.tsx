import { GrafanaDialog } from '@/features/metric/export-policies/providers/grafana';
import { Button, Card, CardContent } from '@datum-ui/components';
import { Icon } from '@datum-ui/components/icons/icon-wrapper';
import { ArrowRightIcon, SignalHighIcon } from 'lucide-react';
import { useState } from 'react';

export const GrafanaSetupCard = ({ projectId }: { projectId: string }) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Card className="w-full overflow-hidden rounded-xl px-3 py-4 shadow sm:pt-6 sm:pb-4">
        <CardContent className="flex flex-col gap-5 p-0 sm:px-6 sm:pb-4">
          <div className="flex items-center gap-2.5">
            <Icon icon={SignalHighIcon} size={20} className="text-secondary stroke-2" />
            <span className="text-base font-semibold">Export Metrics to Grafana</span>
          </div>
          <p className="text-sm font-normal">
            Export metrics from your Datum project to Grafana Cloud using Prometheus remote write.
            Configure credentials, secrets, and an ExportPolicy to start monitoring your proxy.
          </p>
          <Button
            type="quaternary"
            theme="outline"
            size="small"
            onClick={() => setOpen(true)}
            className="w-fit"
            icon={<Icon icon={ArrowRightIcon} className="size-4" />}
            iconPosition="right">
            Get Started
          </Button>
        </CardContent>
      </Card>
      <GrafanaDialog projectId={projectId} open={open} onOpenChange={setOpen} />
    </>
  );
};
