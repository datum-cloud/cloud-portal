import { Card, CardContent } from '@datum-ui/components';

export const ExportPolicyComingSoonCard = () => {
  return (
    <Card className="h-full items-center justify-center bg-transparent py-8 shadow-none">
      <CardContent className="px-8">
        <div className="flex max-w-[283px] flex-col items-center justify-center gap-3.5 text-center">
          <h4 className="text-sm font-semibold">More export policy templates coming soon</h4>
          <p className="text-xs">
            Everything from Datadog, Dynatrace, and Splunk to Kibana and other open source options.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
