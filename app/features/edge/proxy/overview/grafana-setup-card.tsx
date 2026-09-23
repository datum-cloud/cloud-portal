import { GrafanaDialog } from '@/features/metric/export-policies/providers/grafana';
import { Button } from '@datum-cloud/datum-ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@datum-cloud/datum-ui/card';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Text } from '@datum-cloud/datum-ui/typography';
import { ArrowRightIcon, SignalHighIcon } from 'lucide-react';
import { useState } from 'react';

export const GrafanaSetupCard = ({ projectId }: { projectId: string }) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Card size="sm" className="w-full overflow-hidden">
        <CardHeader size="sm">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Icon icon={SignalHighIcon} size={16} className="text-secondary" />
            Export Metrics to Grafana
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Text as="p" weight="normal">
            Export metrics from your Datum project to Grafana Cloud using Prometheus remote write.
            Configure credentials, secrets, and an ExportPolicy to start monitoring your proxy.
          </Text>
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
