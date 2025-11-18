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
  details: Array<{
    recordType: string;
    action: 'created' | 'updated' | 'skipped' | 'failed';
    recordCount: number;
    message?: string;
  }>;
  errors?: Array<{
    recordType: string;
    error: string;
  }>;
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
 * Merge incoming records with existing records
 * Handles duplicate detection based on name, value, and TTL
 */
function mergeRecords(
  existingRecords: any[],
  incomingRecords: any[],
  recordType: string,
  options: Required<ImportOptions>
): { merged: any[]; skippedCount: number } {
  // Replace strategy: replace all existing records
  if (options.mergeStrategy === 'replace') {
    return {
      merged: incomingRecords,
      skippedCount: 0,
    };
  }

  // Append strategy: merge with duplicate detection
  const merged = [...existingRecords];
  let skippedCount = 0;

  for (const newRecord of incomingRecords) {
    const isDuplicate = existingRecords.some((r) => {
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

    if (isDuplicate && options.skipDuplicates) {
      skippedCount++;
    } else {
      merged.push(newRecord);
    }
  }

  return { merged, skippedCount };
}

/**
 * DNS Records Bulk Import API Route
 * Handles importing multiple DNS records from DNS Zone Discovery
 *
 * Logic:
 * - Groups discovery records by type
 * - For each type: create new RecordSet OR append to existing RecordSet
 * - Supports duplicate detection and merge strategies
 * - Returns detailed summary of operations
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

    const details: BulkImportResponse['details'] = [];
    const errors: BulkImportResponse['errors'] = [];

    // Group discovery records by type
    const grouped = groupDiscoveryRecordsByType(discoveryRecordSets);

    // Process each record type
    for (const [recordType, records] of grouped) {
      try {
        summary.totalRecords += records.length;

        // Check if RecordSet exists for this type + zone
        const existingRecordSet = await dnsRecordSetsControl.findByTypeAndZone(
          projectId,
          dnsZoneId,
          recordType
        );

        if (!existingRecordSet) {
          // ===================================================================
          // CREATE: No RecordSet exists → Create new RecordSet with all records
          // ===================================================================
          const dryRunRes = await dnsRecordSetsControl.create(
            projectId,
            {
              dnsZoneRef: { name: dnsZoneId },
              recordType: recordType as any,
              records: records,
            },
            true // dry run
          );

          if (dryRunRes && !options.dryRun) {
            await dnsRecordSetsControl.create(
              projectId,
              {
                dnsZoneRef: { name: dnsZoneId },
                recordType: recordType as any,
                records: records,
              },
              false
            );
          }

          summary.created++;
          details.push({
            recordType,
            action: 'created',
            recordCount: records.length,
            message: `Created new ${recordType} RecordSet with ${records.length} record(s)`,
          });
        } else {
          // ===================================================================
          // APPEND/REPLACE: RecordSet exists → Merge records
          // ===================================================================
          const { merged, skippedCount } = mergeRecords(
            existingRecordSet.records || [],
            records,
            recordType,
            options
          );

          const addedCount = merged.length - (existingRecordSet.records?.length || 0);

          if (addedCount > 0 || options.mergeStrategy === 'replace') {
            // Update RecordSet with merged records
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

            summary.updated++;
            summary.skipped += skippedCount;
            details.push({
              recordType,
              action: 'updated',
              recordCount: addedCount,
              message: `Added ${addedCount} record(s), skipped ${skippedCount} duplicate(s)`,
            });
          } else {
            // All records are duplicates
            summary.skipped += records.length;
            details.push({
              recordType,
              action: 'skipped',
              recordCount: records.length,
              message: 'All records already exist',
            });
          }
        }
      } catch (error: any) {
        summary.failed++;
        errors.push({
          recordType,
          error: error.message || 'Unknown error',
        });
        details.push({
          recordType,
          action: 'failed',
          recordCount: records.length,
          message: error.message || 'Unknown error',
        });
      }
    }

    const response: BulkImportResponse = {
      success: errors.length === 0,
      summary,
      details,
      errors: errors.length > 0 ? errors : undefined,
    };

    if (redirectUri && response.success) {
      return redirectWithToast(redirectUri as string, {
        title: 'DNS records imported successfully',
        description: 'The DNS records have been imported successfully',
        type: 'success',
      });
    }

    return data(response, { status: errors.length === 0 ? 200 : 207 }); // 207 = Multi-Status
  } catch (error: any) {
    return data(
      { success: false, error: error.message || 'An error occurred during bulk import' },
      { status: error.status || 500 }
    );
  }
};
