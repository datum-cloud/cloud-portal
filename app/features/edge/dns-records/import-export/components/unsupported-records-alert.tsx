import type { UnsupportedRecordsInfo } from '../hooks';
import { Alert, AlertDescription, AlertTitle } from '@datum-cloud/datum-ui/alert';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { AlertCircle } from 'lucide-react';

interface UnsupportedRecordsAlertProps {
  unsupportedRecords: UnsupportedRecordsInfo;
  onContactSupport: () => void;
}

/** Explains which record types the import skips, with a way to ask support for them. */
export const UnsupportedRecordsAlert = ({
  unsupportedRecords,
  onContactSupport,
}: UnsupportedRecordsAlertProps) => (
  <Alert variant="destructive" className="mt-4">
    <Icon icon={AlertCircle} className="size-4" />
    <AlertTitle className="text-destructive text-sm">Error</AlertTitle>
    <AlertDescription>
      It&apos;s not possible to import {unsupportedRecords.totalRecords} other record
      {unsupportedRecords.totalRecords > 1 ? 's' : ''} we found as we don&apos;t support the
      following record type
      {unsupportedRecords.types.length > 1 ? 's' : ''}:{' '}
      {unsupportedRecords.types.length > 1
        ? `${unsupportedRecords.types.slice(0, -1).join(', ')}, and ${unsupportedRecords.types.at(-1) ?? ''}`
        : unsupportedRecords.types[0]}
      .{' '}
      <button
        type="button"
        className="focus-visible:outline-primary cursor-pointer rounded-sm underline focus-visible:outline-2 focus-visible:outline-offset-2"
        onClick={onContactSupport}>
        Contact us
      </button>{' '}
      to request support for {unsupportedRecords.types.length > 1 ? 'these' : 'this'} to be added to
      the product backlog.
    </AlertDescription>
  </Alert>
);
