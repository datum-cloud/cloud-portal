import { createDnsRecordSetsControl } from '@/resources/control-plane';
import { IDnsZoneDiscoveryRecordSet } from '@/resources/interfaces/dns.interface';
import { redirectWithToast, validateCSRF } from '@/utils/cookies';
import { BadRequestError, HttpError } from '@/utils/errors';
import { extractValue } from '@/utils/helpers/dns-record.helper';
import { Client } from '@hey-api/client-axios';
import { ActionFunctionArgs, AppLoadContext, data } from 'react-router';

export const ROUTE_PATH = '/api/dns-records/bulk-import' as const;

/**
 * Bulk import options
 */
interface ImportOptions {
  skipDuplicates?: boolean; // Skip duplicate records (default: true)
  mergeStrategy?: 'append' | 'replace'; // Append or replace existing records (default: 'append')
  dryRun?: boolean; // Preview changes without applying (default: false)
}

/**
 * Individual record import detail
 */
interface ImportRecordDetail {
  recordType: string;
  name: string;
  value: string;
  ttl?: number;
  action: 'created' | 'updated' | 'skipped' | 'failed';
  message?: string;
}

/**
 * Bulk import response
 */
interface BulkImportResponse {
  success: boolean;
  summary: {
    totalRecordSets: number;
    totalRecords: number;
    created: number;
    updated: number;
    skipped: number;
    failed: number;
  };
  details: ImportRecordDetail[];
}

/**
 * Group discovery recordSets by record type
 */
function groupDiscoveryRecordsByType(
  discoveryRecordSets: IDnsZoneDiscoveryRecordSet[]
): Map<string, any[]> {
  const grouped = new Map<string, any[]>();

  discoveryRecordSets.forEach((recordSet) => {
    const { recordType, records } = recordSet;
    if (recordType && records) {
      grouped.set(recordType, records);
    }
  });

  return grouped;
}

/**
 * Check if a record is a duplicate of any existing record
 */
function isDuplicateRecord(newRecord: any, existingRecords: any[], recordType: string): boolean {
  return existingRecords.some((r) => {
    // Must match name
    if (r.name !== newRecord.name) return false;

    // Must match value
    const existingValue = extractValue(r, recordType);
    const newValue = extractValue(newRecord, recordType);
    if (existingValue !== newValue) return false;

    // Must match TTL (accounting for null/undefined as "auto")
    const existingTTL = r.ttl ?? null;
    const newTTL = newRecord.ttl ?? null;
    if (existingTTL !== newTTL) return false;

    return true; // Exact duplicate found
  });
}

/**
 * Process records and return individual details for each record
 */
function processRecordsWithDetails(
  existingRecords: any[],
  incomingRecords: any[],
  recordType: string,
  options: Required<ImportOptions>,
  isNewRecordSet: boolean
): {
  merged: any[];
  recordDetails: ImportRecordDetail[];
  counts: { created: number; updated: number; skipped: number };
} {
  const recordDetails: ImportRecordDetail[] = [];
  const counts = { created: 0, updated: 0, skipped: 0 };

  // Replace strategy: all incoming records replace existing
  if (options.mergeStrategy === 'replace') {
    for (const record of incomingRecords) {
      const value = extractValue(record, recordType);
      recordDetails.push({
        recordType,
        name: record.name,
        value,
        ttl: record.ttl,
        action: isNewRecordSet ? 'created' : 'updated',
        message: isNewRecordSet ? 'Created' : 'Replaced existing record',
      });
      if (isNewRecordSet) {
        counts.created++;
      } else {
        counts.updated++;
      }
    }
    return { merged: incomingRecords, recordDetails, counts };
  }

  // Append strategy: merge with duplicate detection
  const merged = [...existingRecords];

  for (const newRecord of incomingRecords) {
    const value = extractValue(newRecord, recordType);
    const isDuplicate = isDuplicateRecord(newRecord, existingRecords, recordType);

    if (isDuplicate && options.skipDuplicates) {
      recordDetails.push({
        recordType,
        name: newRecord.name,
        value,
        ttl: newRecord.ttl,
        action: 'skipped',
        message: 'Record already exists',
      });
      counts.skipped++;
    } else {
      merged.push(newRecord);
      const action = isNewRecordSet ? 'created' : 'updated';
      recordDetails.push({
        recordType,
        name: newRecord.name,
        value,
        ttl: newRecord.ttl,
        action,
        message: isNewRecordSet ? 'Created' : 'Added to existing RecordSet',
      });
      if (isNewRecordSet) {
        counts.created++;
      } else {
        counts.updated++;
      }
    }
  }

  return { merged, recordDetails, counts };
}

/**
 * DNS Records Bulk Import API Route
 * Handles importing multiple DNS records from DNS Zone Discovery
 *
 * Logic:
 * - Groups discovery records by type
 * - For each type: create new RecordSet OR append to existing RecordSet
 * - Supports duplicate detection and merge strategies
 * - Returns detailed summary with individual record results
 */
export const action = async ({ request, context }: ActionFunctionArgs) => {
  const { controlPlaneClient } = context as AppLoadContext;

  try {
    if (request.method !== 'POST') {
      throw new HttpError('Method not allowed', 405);
    }

    const dnsRecordSetsControl = createDnsRecordSetsControl(controlPlaneClient as Client);

    // Parse request body
    const formData = await request.text();
    const payload = JSON.parse(formData);

    const {
      projectId,
      dnsZoneId,
      discoveryRecordSets,
      importOptions = {},
      csrf,
      redirectUri,
    } = payload;

    if (!projectId || !dnsZoneId) {
      throw new BadRequestError('Project ID and DNS Zone ID are required');
    }

    if (!discoveryRecordSets || !Array.isArray(discoveryRecordSets)) {
      throw new BadRequestError('Discovery recordSets array is required');
    }

    // Validate CSRF token
    const csrfFormData = new FormData();
    csrfFormData.append('csrf', csrf);
    await validateCSRF(csrfFormData, request.headers);

    // Set default options
    const options: Required<ImportOptions> = {
      skipDuplicates: importOptions.skipDuplicates ?? true,
      mergeStrategy: importOptions.mergeStrategy ?? 'append',
      dryRun: importOptions.dryRun ?? false,
    };

    // Initialize response summary
    const summary = {
      totalRecordSets: discoveryRecordSets.length,
      totalRecords: 0,
      created: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
    };

    const allDetails: ImportRecordDetail[] = [];

    // Group discovery records by type
    const grouped = groupDiscoveryRecordsByType(discoveryRecordSets);

    // Process each record type
    for (const [recordType, records] of grouped) {
      summary.totalRecords += records.length;

      try {
        // Check if RecordSet exists for this type + zone
        const existingRecordSet = await dnsRecordSetsControl.findByTypeAndZone(
          projectId,
          dnsZoneId,
          recordType
        );

        const isNewRecordSet = !existingRecordSet;
        const existingRecords = existingRecordSet?.records || [];

        // Process records and get individual details
        const { merged, recordDetails, counts } = processRecordsWithDetails(
          existingRecords,
          records,
          recordType,
          options,
          isNewRecordSet
        );

        // Only proceed if there are records to add/update
        const hasChanges =
          merged.length > existingRecords.length || options.mergeStrategy === 'replace';

        if (hasChanges) {
          if (isNewRecordSet) {
            // CREATE: No RecordSet exists → Create new RecordSet with all records
            const dryRunRes = await dnsRecordSetsControl.create(
              projectId,
              {
                dnsZoneRef: { name: dnsZoneId },
                recordType: recordType as any,
                records: merged,
              },
              true // dry run
            );

            if (dryRunRes && !options.dryRun) {
              await dnsRecordSetsControl.create(
                projectId,
                {
                  dnsZoneRef: { name: dnsZoneId },
                  recordType: recordType as any,
                  records: merged,
                },
                false
              );
            }
          } else {
            // UPDATE: RecordSet exists → Update with merged records
            const dryRunRes = await dnsRecordSetsControl.update(
              projectId,
              existingRecordSet.name!,
              { records: merged },
              true
            );

            if (dryRunRes && !options.dryRun) {
              await dnsRecordSetsControl.update(
                projectId,
                existingRecordSet.name!,
                { records: merged },
                false
              );
            }
          }
        }

        // Add record details and update summary counts
        allDetails.push(...recordDetails);
        summary.created += counts.created;
        summary.updated += counts.updated;
        summary.skipped += counts.skipped;
      } catch (error: any) {
        // Mark all records of this type as failed
        for (const record of records) {
          const value = extractValue(record, recordType);
          allDetails.push({
            recordType,
            name: record.name,
            value,
            ttl: record.ttl,
            action: 'failed',
            message: error.message || 'Unknown error',
          });
          summary.failed++;
        }
      }
    }

    const hasErrors = summary.failed > 0;
    const response: BulkImportResponse = {
      success: !hasErrors,
      summary,
      details: allDetails,
    };

    if (!hasErrors) {
      if (redirectUri) {
        return redirectWithToast(redirectUri as string, {
          title: 'DNS records imported successfully',
          description: 'The DNS records have been imported successfully',
          type: 'success',
        });
      }

      return data({ success: true, data: { summary, details: allDetails } }, { status: 200 });
    }

    // Partial success or all failed
    const successCount = summary.created + summary.updated + summary.skipped;
    return data(
      {
        success: successCount > 0,
        error: `${summary.failed} record(s) failed to import`,
        data: { summary, details: allDetails },
      },
      { status: successCount > 0 ? 207 : 400 } // 207 = Multi-Status for partial success
    );
  } catch (error: any) {
    return data(
      { success: false, error: error.message || 'An error occurred during bulk import' },
      { status: error.status || 500 }
    );
  }
};
