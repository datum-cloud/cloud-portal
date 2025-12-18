import { DnsRecordTable } from '@/features/edge/dns-records';
import { IFlattenedDnsRecord } from '@/resources/interfaces/dns.interface';
import { ROUTE_PATH as DNS_RECORDS_BULK_IMPORT_PATH } from '@/routes/api/dns-records/bulk-import';
import { ROUTE_PATH as DNS_ZONE_DISCOVERY_DETAIL_PATH } from '@/routes/api/dns-zone-discoveries/$id';
import { paths } from '@/utils/config/paths.config';
import { flattenDnsRecordSets, type ImportResult } from '@/utils/helpers/dns-record.helper';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  SpinnerIcon,
  toast,
} from '@datum-ui/components';
import { PlusIcon } from 'lucide-react';
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

    importFetcher.submit(
      JSON.stringify({
        projectId,
        dnsZoneId,
        discoveryRecordSets: rawRecordSets,
        importOptions: { skipDuplicates: true, mergeStrategy: 'append' },
        csrf,
        redirectUri: getPathWithParams(paths.project.detail.dnsZones.detail.root, {
          projectId,
          dnsZoneId,
        }),
      }),
      {
        method: 'POST',
        action: DNS_RECORDS_BULK_IMPORT_PATH,
        encType: 'application/json',
      }
    );
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
      const data = importFetcher.data as {
        success: boolean;
        error?: string;
        data?: ImportResult;
      };

      // Show summary toast based on import result
      if (data.data) {
        const { summary } = data.data;
        const importedCount = summary.created + summary.updated;
        const failedCount = summary.failed;

        if (failedCount === 0 && importedCount > 0) {
          toast.success('DNS records', {
            description: `${importedCount} records imported successfully`,
          });
        } else if (importedCount > 0 && failedCount > 0) {
          toast.warning('DNS records', {
            description: `${importedCount} records imported, ${failedCount} failed`,
          });
        } else if (failedCount > 0) {
          toast.error('DNS records', {
            description: `${failedCount} records failed to import`,
          });
        }
      } else if (data.success) {
        toast.success('DNS records', {
          description: 'Imported successfully.',
        });
      } else {
        toast.error('DNS records', {
          description: data.error || 'An unexpected error occurred',
        });
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
            <CardContent className="flex min-h-[346px] flex-col items-center justify-center gap-4.5">
              <SpinnerIcon size="xl" aria-hidden="true" />
              <p className="text-sm font-semibold">Discovering DNS records...</p>
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
                projectId={projectId}
                showStatus={false}
                className="rounded-xl"
                tableContainerClassName="max-h-[400px] overflow-y-auto rounded-xl"
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
