import { DnsRecordTable } from '@/features/edge/dns-records';
import { type IFlattenedDnsRecord, useBulkImportDnsRecords } from '@/resources/dns-records';
import { useCreateDnsZoneDiscovery, useDnsZoneDiscovery } from '@/resources/dns-zone-discoveries';
import { paths } from '@/utils/config/paths.config';
import { transformFlattenedToRecordSets } from '@/utils/helpers/dns';
import { flattenDnsRecordSets, type ImportResult } from '@/utils/helpers/dns-record.helper';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { Button } from '@datum-cloud/datum-ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@datum-cloud/datum-ui/card';
import { Icon, SpinnerIcon } from '@datum-cloud/datum-ui/icons';
import { toast } from '@datum-cloud/datum-ui/toast';
import { PlusIcon } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';

const MAX_POLL_ATTEMPTS = 5;

export const DnsZoneDiscoveryPreview = ({
  projectId,
  dnsZoneId,
}: {
  projectId: string;
  dnsZoneId: string;
}) => {
  const navigate = useNavigate();
  const [dnsRecords, setDnsRecords] = useState<IFlattenedDnsRecord[]>([]);
  const [selectedRecords, setSelectedRecords] = useState<IFlattenedDnsRecord[]>([]);
  const [discoveryId, setDiscoveryId] = useState('');

  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pollCountRef = useRef<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showEmpty, setShowEmpty] = useState(false);
  const [shouldPoll, setShouldPoll] = useState(false);

  // Create discovery on mount
  const createDiscovery = useCreateDnsZoneDiscovery(projectId, {
    onSuccess: (discovery) => {
      setDiscoveryId(discovery.name);
      setShouldPoll(true);
    },
    onError: (error) => {
      toast.error('DNS', {
        description: error.message || 'Failed to create DNS zone discovery',
      });
      setIsLoading(false);
      setShowEmpty(true);
    },
  });

  const hasTriggeredRef = useRef(false);
  useEffect(() => {
    if (projectId && dnsZoneId && !hasTriggeredRef.current) {
      hasTriggeredRef.current = true;
      createDiscovery.mutate(dnsZoneId);
    }
  }, [projectId, dnsZoneId]);

  // Poll discovery results
  const { data: discoveryData, error: discoveryError } = useDnsZoneDiscovery(
    projectId,
    discoveryId,
    {
      enabled: !!discoveryId && shouldPoll,
      refetchInterval: shouldPoll ? 2000 : false,
    }
  );

  // Bulk import mutation
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

    if (pollCountRef.current > MAX_POLL_ATTEMPTS) {
      setShouldPoll(false);
      loadingTimeoutRef.current = setTimeout(() => {
        setIsLoading(false);
        if (dnsRecords.length === 0) {
          setShowEmpty(true);
        }
      }, 2500);
      return;
    }

    if (discoveryData?.recordSets && discoveryData.recordSets.length > 0) {
      const flattened = flattenDnsRecordSets(discoveryData.recordSets, dnsZoneId);

      setDnsRecords(flattened);
      setShouldPoll(false);
      setIsLoading(false);
    }

    return cleanUp;
  }, [discoveryData, shouldPoll, dnsZoneId]);

  useEffect(() => {
    if (discoveryError) {
      toast.error(discoveryError.message || 'An unexpected error occurred');
    }
  }, [discoveryError]);

  const handleBulkImport = () => {
    if (selectedRecords.length === 0) return;

    const recordSets = transformFlattenedToRecordSets(selectedRecords);
    bulkImportMutation.mutate({
      discoveryRecordSets: recordSets,
      importOptions: { skipDuplicates: true, mergeStrategy: 'append' },
    });
  };

  const handleSkip = () => {
    setShouldPoll(false);
    cleanUp();
    navigateToZoneDetails();
  };

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
            <CardFooter className="flex justify-center px-5 pb-5">
              <Button htmlType="button" type="quaternary" theme="outline" onClick={handleSkip}>
                Cancel DNS record discovery
              </Button>
            </CardFooter>
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
                We found some records from your existing provider. These may be incomplete. Select
                the records you want to import.
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
                enableMultiSelect
                getRowId={(row, index) => {
                  return `${row.type}-${row.name}-${row.value}-${index + 1}`;
                }}
                onSelectionChange={(_selectedIds, rows) => {
                  setSelectedRecords(rows);
                }}
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
                disabled={selectedRecords.length === 0 || bulkImportMutation.isPending}
                onClick={handleBulkImport}
                loading={bulkImportMutation.isPending}
                icon={<Icon icon={PlusIcon} className="size-4" />}>
                {bulkImportMutation.isPending
                  ? 'Importing...'
                  : `Add ${selectedRecords.length} record${selectedRecords.length !== 1 ? 's' : ''}`}
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
