import { DnsRecordTable } from '@/features/edge/dns-records';
import { IFlattenedDnsRecord, useBulkImportDnsRecords } from '@/resources/dns-records';
import { useDnsZoneDiscovery } from '@/resources/dns-zone-discoveries';
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
import { Icon } from '@datum-ui/components/icons/icon-wrapper';
import { PlusIcon } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';

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
  const navigate = useNavigate();
  const [dnsRecords, setDnsRecords] = useState<IFlattenedDnsRecord[]>([]);
  const [rawRecordSets, setRawRecordSets] = useState<any[]>([]); // Store raw discovery recordSets

  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pollCountRef = useRef<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showEmpty, setShowEmpty] = useState(false);
  const [shouldPoll, setShouldPoll] = useState(true);

  // Use React Query for polling DNS zone discovery
  const { data: discoveryData, error: discoveryError } = useDnsZoneDiscovery(
    projectId,
    dnsZoneDiscoveryId,
    {
      enabled: !!projectId && !!dnsZoneDiscoveryId && shouldPoll,
      refetchInterval: shouldPoll ? 2000 : false,
    }
  );

  // Use React Query mutation for bulk import
  const bulkImportMutation = useBulkImportDnsRecords(projectId, dnsZoneId, {
    onSuccess: (result: ImportResult) => {
      const { summary } = result;
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
      } else {
        toast.success('DNS records', {
          description: 'Imported successfully.',
        });
      }

      // Navigate to DNS zone detail after successful import
      navigateToZoneDetails();
    },
    onError: (error: Error) => {
      toast.error('DNS records', {
        description: error.message || 'An unexpected error occurred',
      });
    },
  });

  const navigateToZoneDetails = () => {
    navigate(
      getPathWithParams(paths.project.detail.dnsZones.detail.root, {
        projectId,
        dnsZoneId,
      })
    );
  };

  const cleanUp = () => {
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }
  };

  // Handle polling count and discovery data processing
  useEffect(() => {
    if (!shouldPoll) return;

    pollCountRef.current += 1;

    // Stop polling after MAX_POLL_ATTEMPTS
    if (pollCountRef.current > MAX_POLL_ATTEMPTS) {
      setShouldPoll(false);
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

    // Process discovery data when available
    if (discoveryData?.recordSets && discoveryData.recordSets.length > 0) {
      const flattened = flattenDnsRecordSets(discoveryData.recordSets, dnsZoneId);

      // Update both states together to ensure they're in sync
      setRawRecordSets(discoveryData.recordSets);
      setDnsRecords(flattened);
      setShouldPoll(false);
      setIsLoading(false);
    }

    return cleanUp;
  }, [discoveryData, shouldPoll, dnsRecords.length, dnsZoneId]);

  // Handle discovery errors
  useEffect(() => {
    if (discoveryError) {
      toast.error(discoveryError.message || 'An unexpected error occurred');
    }
  }, [discoveryError]);

  const handleBulkImport = () => {
    if (rawRecordSets.length === 0) {
      toast.error('No records to import');
      return;
    }

    bulkImportMutation.mutate({
      discoveryRecordSets: rawRecordSets,
      importOptions: { skipDuplicates: true, mergeStrategy: 'append' },
    });
  };

  const handleSkip = () => {
    // Stop polling and cleanup
    setShouldPoll(false);
    cleanUp();
    navigateToZoneDetails();
  };

  return (
    <Card className="rounded-xl py-5">
      <AnimatePresence mode="wait">
        {!isLoading ? (
          <motion.div
            key="pending"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}>
            <CardContent className="flex min-h-[346px] flex-col items-center justify-center gap-4.5">
              <SpinnerIcon size="xl" aria-hidden="true" />
              <p className="text-sm font-semibold">Discovering DNS records...</p>
              <Button htmlType="button" type="quaternary" theme="outline" onClick={handleSkip}>
                Skip
              </Button>
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
                disabled={bulkImportMutation.isPending}
                onClick={navigateToZoneDetails}>
                Skip
              </Button>
              <Button
                htmlType="button"
                type="primary"
                theme="solid"
                disabled={dnsRecords.length === 0}
                onClick={handleBulkImport}
                loading={bulkImportMutation.isPending}
                icon={<Icon icon={PlusIcon} className="size-4" />}>
                {bulkImportMutation.isPending ? 'Importing...' : `Add ${dnsRecords.length} records`}
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
                onClick={navigateToZoneDetails}>
                Continue to DNS Zone
              </Button>
            </CardContent>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </Card>
  );
};
