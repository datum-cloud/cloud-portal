import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { paths } from '@/config/paths';
import { IDomainControlResponse } from '@/resources/interfaces/domain.interface';
import { ROUTE_PATH as CLOUD_VALIDATION_DNS_PATH } from '@/routes/api/cloudvalid/dns';
import { getPathWithParams } from '@/utils/path';
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
    <Card className="border-info-300 bg-info-100 border">
      <CardHeader>
        <CardTitle className="text-info-500 dark:text-foreground flex items-center gap-2">
          <ZapIcon className="text-info-500 dark:text-foreground size-4" />
          Automatic DNS Configuration
        </CardTitle>
        <CardDescription className="dark:text-foreground">
          Skip the manual DNS setup process and let CloudValid automatically configure your DNS
          records for you.
        </CardDescription>
      </CardHeader>
      <CardContent className="text-muted-foreground dark:text-foreground flex flex-col gap-2 text-sm">
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
          type="button"
          onClick={handleQuickSetup}
          disabled={fetcher.state === 'submitting' || fetcher.state === 'loading'}
          isLoading={fetcher.state === 'submitting' || fetcher.state === 'loading'}>
          <ExternalLink className="size-4" />
          Set Up DNS Automatically with CloudValid
        </Button>
        <p className="text-muted-foreground dark:text-foreground text-center text-xs">
          You&apos;ll be redirected to CloudValid to authorize DNS changes
        </p>
      </CardFooter>
    </Card>
  );
};
