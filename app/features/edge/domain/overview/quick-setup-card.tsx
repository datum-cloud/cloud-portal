import { CreateDNSSetupResponse } from '@/modules/cloudvalid';
import type { Domain } from '@/resources/domains';
import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { Button, toast } from '@datum-ui/components';
import { Card, CardContent } from '@datum-ui/components';
import { Icon } from '@datum-ui/components/icons/icon-wrapper';
import { useMutation } from '@tanstack/react-query';
import { CheckIcon, CloudLightningIcon } from 'lucide-react';

const CLOUD_VALIDATION_DNS_PATH = '/api/cloudvalid/dns' as const;

type DnsSetupInput = {
  domain: string;
  dnsName: string;
  dnsContent: string;
  redirectUri: string;
};

type DnsSetupResponse = {
  success: boolean;
  error?: string;
  data?: CreateDNSSetupResponse;
};

export const QuickSetupCard = ({ projectId, domain }: { projectId: string; domain: Domain }) => {
  const dnsSetupMutation = useMutation<DnsSetupResponse, Error, DnsSetupInput>({
    mutationFn: async (input) => {
      const response = await fetch(CLOUD_VALIDATION_DNS_PATH, {
        method: 'POST',
        body: JSON.stringify({
          domain: input.domain,
          dnsName: input.dnsName,
          dnsContent: input.dnsContent,
          redirectUri: input.redirectUri,
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to submit DNS setup');
      }

      return data;
    },
    onSuccess: (data) => {
      if (data.data?.public_url) {
        window.open(data.data.public_url, '_blank');
      }
    },
    onError: (error) => {
      toast.error('Failed to submit DNS setup', { description: error.message });
    },
  });

  const dnsRecord = domain.status?.verification?.dnsRecord;

  const setupItems = [
    'Automatically adds the required TXT record to your DNS',
    'Configures verification settings without manual intervention',
    'Completes domain validation in minutes instead of hours',
    'No manual steps required',
  ];

  const handleQuickSetup = () => {
    dnsSetupMutation.mutate({
      domain: domain.domainName ?? '',
      dnsName: dnsRecord?.name ?? '',
      dnsContent: dnsRecord?.content ?? '',
      redirectUri: `${window.location.origin}${getPathWithParams(paths.project.detail.domains.detail.overview, { projectId, domainId: domain.name })}?cloudvalid=success`,
    });
  };

  return (
    <Card className="border-card-success-border bg-card-success w-full p-0 shadow-md">
      <CardContent className="flex flex-col gap-5 px-9 py-8">
        <div className="flex items-center gap-2.5">
          <Icon icon={CloudLightningIcon} size={20} className="text-tertiary stroke-2" />
          <span className="text-base font-semibold">Automatic Verification</span>
        </div>
        <div className="flex flex-col gap-3.5">
          <p className="text-[14px] font-normal">
            Skip the manual DNS setup process and let Datum automatically configure your DNS records
            and validate your domain for you.
          </p>
          <ul className="space-y-[7px] text-[14px] font-normal">
            {setupItems.map((item, index) => (
              <li className="flex items-start gap-2.5" key={`quick-setup-item-${index}`}>
                <Icon icon={CheckIcon} className="text-success mt-0.5 size-3.5 shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
        <Button
          className="w-fit px-3.5 py-2.5 font-semibold"
          type="tertiary"
          size="small"
          onClick={handleQuickSetup}
          disabled={dnsSetupMutation.isPending}
          loading={dnsSetupMutation.isPending}>
          Verify your domain
        </Button>
      </CardContent>
    </Card>
  );
};
