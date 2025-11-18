import { DnsRecordTable } from '@/features/edge/dns-zone/overview/dns-records';
import { IFlattenedDnsRecord } from '@/resources/interfaces/dns.interface';
import { ROUTE_PATH as DNS_RECORDS_BULK_IMPORT_PATH } from '@/routes/api/dns-records/bulk-import';
import { ROUTE_PATH as DNS_ZONE_DISCOVERY_DETAIL_PATH } from '@/routes/api/dns-zone-discoveries/$id';
import { paths } from '@/utils/config/paths.config';
import { flattenDnsRecordSets } from '@/utils/helpers/dns-record.helper';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  toast,
} from '@datum-ui/components';
import { Loader2, PlusIcon } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { useFetcher, useNavigate } from 'react-router';
import { useAuthenticityToken } from 'remix-utils/csrf/react';

const MAX_POLL_ATTEMPTS = 5;

export const DnsZoneDiscoveryPreview = ({
  projectId,
  dnsZoneDiscoveryId,
  dnsZoneId,
}: {
  projectId: string;
  dnsZoneDiscoveryId: string;
  dnsZoneId: string;
}) => {
  const fetcher = useFetcher({
    key: 'dns-zone-discovery-preview',
  });
  const importFetcher = useFetcher({ key: 'dns-records-bulk-import' });
  const csrf = useAuthenticityToken();
  const navigate = useNavigate();
  const [dnsRecords, setDnsRecords] = useState<IFlattenedDnsRecord[]>([]);
  const [rawRecordSets, setRawRecordSets] = useState<any[]>([]); // Store raw discovery recordSets

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pollCountRef = useRef<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showEmpty, setShowEmpty] = useState(false);

  const cleanUp = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }
  };

  useEffect(() => {
    // Start polling if we have required IDs
    if (projectId && dnsZoneDiscoveryId) {
      intervalRef.current = setInterval(() => {
        pollCountRef.current += 1;

        // Stop polling after MAX_POLL_ATTEMPTS
        if (pollCountRef.current > MAX_POLL_ATTEMPTS) {
          cleanUp();
          // Wait 2.5 seconds before hiding loading
          loadingTimeoutRef.current = setTimeout(() => {
            setIsLoading(false);
            // Show empty state only if no records found after all attempts
            if (dnsRecords.length === 0) {
              setShowEmpty(true);
            }
          }, 2500);
          return;
        }

        // Fetch discovery data
        fetcher.load(
          getPathWithParams(DNS_ZONE_DISCOVERY_DETAIL_PATH, { id: dnsZoneDiscoveryId }) +
            `?projectId=${projectId}`
        );
      }, 2000);
    }

    return cleanUp;
  }, [projectId, dnsZoneDiscoveryId]);

  const handleBulkImport = () => {
    if (rawRecordSets.length === 0) {
      toast.error('No records to import');
      return;
    }

    try {
      const payload = {
        projectId,
        dnsZoneId,
        discoveryRecordSets: rawRecordSets, // Send raw recordSets, not flattened
        importOptions: { skipDuplicates: true, mergeStrategy: 'append' },
        csrf: csrf as string,
        redirectUri: getPathWithParams(paths.project.detail.dnsZones.detail.root, {
          projectId,
          dnsZoneId,
        }),
      };

      importFetcher.submit(JSON.stringify(payload), {
        method: 'POST',
        action: DNS_RECORDS_BULK_IMPORT_PATH,
        encType: 'application/json',
      });
    } catch (error: any) {
      toast.error('Failed to add DNS records', {
        description: error.message || 'An unexpected error occurred',
      });
    }
  };

  useEffect(() => {
    if (fetcher.data && fetcher.state === 'idle') {
      if (fetcher.data?.success) {
        const recordSets = fetcher.data?.data?.recordSets || [];

        // Flatten discovery records for display using the helper function
        if (recordSets.length > 0) {
          const flattened = flattenDnsRecordSets(recordSets, dnsZoneId);

          // Update both states together to ensure they're in sync
          setRawRecordSets(recordSets);
          setDnsRecords(flattened);
          cleanUp();
          // Wait 2.5 seconds before hiding loading
          loadingTimeoutRef.current = setTimeout(() => {
            setIsLoading(false);
          }, 2500);
        }
      } else {
        toast.error(fetcher.data?.error || 'An unexpected error occurred');
      }
    }
  }, [fetcher.data, fetcher.state, dnsZoneId]);

  useEffect(() => {
    if (importFetcher.data && importFetcher.state === 'idle') {
      if (importFetcher.data?.success) {
        toast.success('DNS records imported successfully', {
          description: 'The DNS records have been imported successfully',
        });
      } else {
        toast.error(importFetcher.data?.error || 'An unexpected error occurred');
      }
    }
  }, [importFetcher.data, importFetcher.state]);

  return (
    <Card className="rounded-xl py-5">
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="pending"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}>
            <CardContent className="flex min-h-[346px] flex-col items-center justify-center gap-4">
              <Loader2 className="text-primary h-8 w-8 animate-spin" />
              <p className="text-muted-foreground text-sm">Discovering DNS records...</p>
            </CardContent>
          </motion.div>
        ) : dnsRecords.length > 0 ? (
          <motion.div
            key="loaded"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}>
            <CardHeader className="px-5">
              <CardTitle>Add DNS records</CardTitle>
              <CardDescription>
                We found some records from your existing provider. These may be incomplete. Shall we
                import them?
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5">
              <DnsRecordTable
                className="rounded-xl"
                tableContainerClassName="rounded-xl"
                data={dnsRecords}
                mode="compact"
              />
            </CardContent>

            <CardFooter className="flex justify-end gap-3 px-5">
              <Button
                htmlType="button"
                type="quaternary"
                theme="outline"
                disabled={importFetcher.state === 'submitting'}
                onClick={() =>
                  navigate(
                    getPathWithParams(paths.project.detail.dnsZones.detail.root, {
                      projectId,
                      dnsZoneId,
                    })
                  )
                }>
                Skip
              </Button>
              <Button
                htmlType="button"
                type="primary"
                theme="solid"
                disabled={dnsRecords.length === 0}
                onClick={handleBulkImport}
                loading={importFetcher.state === 'submitting'}
                icon={<PlusIcon className="size-4" />}>
                {importFetcher.state === 'submitting'
                  ? 'Importing...'
                  : `Add ${dnsRecords.length} records`}
              </Button>
            </CardFooter>
          </motion.div>
        ) : showEmpty ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}>
            <CardContent className="flex min-h-[346px] flex-col items-center justify-center gap-4">
              <p className="text-muted-foreground text-sm">
                No DNS records found from your existing provider.
              </p>
              <Button
                htmlType="button"
                type="quaternary"
                theme="outline"
                onClick={() =>
                  navigate(
                    getPathWithParams(paths.project.detail.dnsZones.detail.root, {
                      projectId,
                      dnsZoneId,
                    })
                  )
                }>
                Continue to DNS Zone
              </Button>
            </CardContent>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </Card>
  );
};
