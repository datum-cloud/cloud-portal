import { IDomainControlResponse } from '@/resources/interfaces/domain.interface';
import { ROUTE_PATH as CLOUD_VALIDATION_DNS_PATH } from '@/routes/api/cloudvalid/dns';
import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { Button } from '@datum-ui/components';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@datum-ui/components';
import { ExternalLink, ZapIcon } from 'lucide-react';
import { useEffect } from 'react';
import { useFetcher } from 'react-router';
import { toast } from 'sonner';

export const QuickSetupCard = ({
  projectId,
  domain,
}: {
  projectId: string;
  domain: IDomainControlResponse;
}) => {
  const fetcher = useFetcher({ key: 'dns-quick-setup' });
  const dnsRecord = domain.status?.verification?.dnsRecord;

  const handleQuickSetup = () => {
    fetcher.submit(
      {
        domain: domain.domainName ?? '',
        dnsName: dnsRecord?.name ?? '',
        dnsContent: dnsRecord?.content ?? '',
        redirectUri: `${window.location.origin}${getPathWithParams(paths.project.detail.domains.detail.overview, { projectId, domainId: domain.name })}?cloudvalid=success`,
      },
      {
        method: 'POST',
        action: CLOUD_VALIDATION_DNS_PATH,
      }
    );
  };

  useEffect(() => {
    if (fetcher.data && fetcher.state === 'idle') {
      const { success, data, error } = fetcher.data;

      if (success && data?.public_url) {
        window.open(data.public_url, '_blank');
      } else if (error) {
        toast.error(error);
      }
    }
  }, [fetcher.data, fetcher.state]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ZapIcon className="size-4" />
          Automatic DNS Configuration
        </CardTitle>
        <CardDescription>
          Skip the manual DNS setup process and let CloudValid automatically configure your DNS
          records for you.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 text-sm">
        <p className="font-medium">What this does:</p>
        <ul className="ml-4 list-disc">
          <li>Automatically adds the required TXT record to your DNS</li>
          <li>Configures verification settings without manual intervention</li>
          <li>Completes domain validation in minutes instead of hours</li>
        </ul>
      </CardContent>
      <CardFooter className="flex flex-col gap-2">
        <Button
          className="w-full font-medium"
          htmlType="button"
          onClick={handleQuickSetup}
          disabled={fetcher.state === 'submitting' || fetcher.state === 'loading'}
          loading={fetcher.state === 'submitting' || fetcher.state === 'loading'}>
          <ExternalLink className="size-4" />
          Set Up DNS Automatically with CloudValid
        </Button>
        <p className="text-muted-foreground text-center text-xs">
          You&apos;ll be redirected to CloudValid to authorize DNS changes
        </p>
      </CardFooter>
    </Card>
  );
};
