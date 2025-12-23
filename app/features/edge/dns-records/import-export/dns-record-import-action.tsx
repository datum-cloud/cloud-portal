import { DropzoneStateContent, ImportResultTable } from './components';
import { useDnsRecordExport, useDnsRecordImport } from './hooks';
import { DnsRecordTable } from '@/features/edge/dns-records';
import { IFlattenedDnsRecord } from '@/resources/interfaces/dns.interface';
import { getImportResultStatus } from '@/utils/helpers/dns-record.helper';
import { openSupportMessage } from '@/utils/open-support-message';
import { Alert, AlertDescription, Button, Dialog } from '@datum-ui/components';
import { Dropzone, DropzoneEmptyState } from '@datum-ui/components/dropzone/dropzone';
import { Icon } from '@datum-ui/components/icons/icon-wrapper';
import { Popover, PopoverContent, PopoverTrigger } from '@shadcn/ui/popover';
import { DownloadIcon, FileTextIcon, Import, PlusIcon } from 'lucide-react';
import { useState } from 'react';

// =============================================================================
// Constants
// =============================================================================

const MAX_FILE_SIZE = 1024 * 1024; // 1MB

const ACCEPTED_FILE_TYPES = {
  'text/plain': ['.zone', '.db', '.txt'],
  'application/octet-stream': ['.zone', '.db'],
};

// =============================================================================
// Types
// =============================================================================

interface DnsRecordImportExportProps {
  origin?: string;
  existingRecords: IFlattenedDnsRecord[];
  projectId: string;
  dnsZoneId: string;
  onSuccess?: () => void;
}

// =============================================================================
// Main Component
// =============================================================================

export const DnsRecordImportAction = ({
  origin,
  existingRecords,
  projectId,
  dnsZoneId,
  onSuccess,
}: DnsRecordImportExportProps) => {
  const [popoverOpen, setPopoverOpen] = useState(false);

  // Import hook
  const {
    files,
    dropzoneState,
    errorMessage,
    handleDrop,
    handleDropError,
    dialogOpen,
    setDialogOpen,
    dialogView,
    flattenedRecords,
    unsupportedRecords,
    closeDialog,
    isImporting,
    handleImport,
    importResult,
  } = useDnsRecordImport({
    projectId,
    dnsZoneId,
    onSuccess,
  });

  // Export hook
  const { isExporting, handleExport } = useDnsRecordExport({
    existingRecords,
    dnsZoneId,
    origin,
  });

  const handleDropWithClose = async (droppedFiles: File[]) => {
    await handleDrop(droppedFiles);
    setPopoverOpen(false);
  };

  const handleContactSupport = () => {
    openSupportMessage({ subject: 'DNS Record Import Support' });
  };

  return (
    <>
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <Button
            htmlType="button"
            type="secondary"
            theme="outline"
            size="small"
            className="border-secondary/20 hover:border-secondary">
            <Icon icon={Import} className="size-4" />
            Import & Export
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 rounded-xl p-7">
          {/* Import Section */}
          <div className="space-y-4">
            <h2 className="text-sm font-semibold">Import DNS Records</h2>

            <Dropzone
              accept={ACCEPTED_FILE_TYPES}
              maxFiles={1}
              maxSize={MAX_FILE_SIZE}
              onDrop={handleDropWithClose}
              onError={handleDropError}
              src={files}
              disabled={dropzoneState === 'loading'}
              className="hover:border-primary w-full hover:bg-transparent">
              <DropzoneEmptyState
                icon={
                  <Icon
                    icon={FileTextIcon}
                    className="text-primary mb-3 size-9! stroke-1"
                    size={36}
                  />
                }
                description={
                  <p className="text-foreground text-xs font-normal">
                    <span className="underline">Select a file</span> or drag it here <br /> (BIND
                    format only)
                  </p>
                }
              />
              <DropzoneStateContent state={dropzoneState} errorMessage={errorMessage} />
            </Dropzone>
          </div>

          {/* Export Section */}
          <div className="mt-6 space-y-4">
            <h2 className="text-sm font-semibold">Export DNS Records</h2>

            <Button
              htmlType="button"
              type="secondary"
              theme="solid"
              size="small"
              onClick={handleExport}
              disabled={isExporting}
              loading={isExporting}
              icon={<Icon icon={DownloadIcon} className="size-4" />}
              className="font-semibold">
              {isExporting ? 'Exporting...' : 'Download file'}
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {/* Import Dialog - Preview and Result Views */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <Dialog.Content className="max-w-4xl sm:max-w-4xl">
          {dialogView === 'preview' ? (
            <>
              <Dialog.Header
                title="Import DNS Records"
                description="Here are the records we identified from your file"
                onClose={closeDialog}
                className="border-b-0"
              />
              <Dialog.Body className="px-5">
                <DnsRecordTable
                  projectId={projectId}
                  showStatus={false}
                  className="rounded-xl"
                  tableContainerClassName="rounded-xl"
                  data={flattenedRecords}
                  mode="compact"
                />

                {unsupportedRecords && unsupportedRecords.totalRecords > 0 && (
                  <Alert variant="destructive" className="mt-4">
                    <AlertDescription>
                      It&apos;s not possible to import {unsupportedRecords.totalRecords} other
                      record
                      {unsupportedRecords.totalRecords > 1 ? 's' : ''} we found as we don&apos;t
                      support the following record type
                      {unsupportedRecords.types.length > 1 ? 's' : ''}:{' '}
                      {unsupportedRecords.types.length > 1
                        ? `${unsupportedRecords.types.slice(0, -1).join(', ')}, and ${unsupportedRecords.types.slice(-1)}`
                        : unsupportedRecords.types[0]}
                      .{' '}
                      <span className="cursor-pointer underline" onClick={handleContactSupport}>
                        Contact us
                      </span>{' '}
                      to request support for{' '}
                      {unsupportedRecords.types.length > 1 ? 'these' : 'this'} to be added to the
                      product backlog.
                    </AlertDescription>
                  </Alert>
                )}
              </Dialog.Body>
              <Dialog.Footer className="border-t-0">
                <Button
                  type="quaternary"
                  theme="outline"
                  onClick={closeDialog}
                  disabled={isImporting}>
                  Cancel
                </Button>
                <Button
                  htmlType="button"
                  type="primary"
                  theme="solid"
                  disabled={flattenedRecords.length === 0 || isImporting}
                  loading={isImporting}
                  onClick={handleImport}
                  icon={<Icon icon={PlusIcon} className="size-4" />}>
                  {isImporting ? 'Importing...' : `Import ${flattenedRecords.length} record(s)`}
                </Button>
              </Dialog.Footer>
            </>
          ) : (
            <>
              <Dialog.Header
                title="Import Results"
                description={
                  importResult
                    ? `${importResult.summary.created + importResult.summary.updated} records imported, ${importResult.summary.failed} failed`
                    : 'Import completed'
                }
                onClose={closeDialog}
                className="border-b-0"
              />
              <Dialog.Body className="px-5 py-0">
                {importResult && importResult.details.length > 0 ? (
                  <>
                    {getImportResultStatus(importResult.details) === 'warning' && (
                      <Alert variant="warning" className="mb-4">
                        <AlertDescription>
                          Some records failed to import. Please review the details below.
                        </AlertDescription>
                      </Alert>
                    )}
                    {getImportResultStatus(importResult.details) === 'error' && (
                      <Alert variant="destructive" className="mb-4">
                        <AlertDescription>
                          All records failed to import. Please review the error messages below.
                        </AlertDescription>
                      </Alert>
                    )}
                    <ImportResultTable details={importResult.details} />
                  </>
                ) : (
                  <p className="text-muted-foreground text-sm">No import details available.</p>
                )}
              </Dialog.Body>
              <Dialog.Footer className="border-t-0">
                <Button type="primary" theme="solid" onClick={closeDialog}>
                  Done
                </Button>
              </Dialog.Footer>
            </>
          )}
        </Dialog.Content>
      </Dialog>
    </>
  );
};
