import type { DeleteDnsRecordInput } from './dns-record.queries';
import type { CreateDnsRecordSchema, DnsRecordSet } from './dns-record.schema';
import type { DnsRecordService } from './dns-record.service';
import { createDnsRecordService } from './dns-record.service';
import { logger } from '@/modules/logger';
import type { IDnsZoneDiscoveryRecordSet } from '@/resources/dns-zone-discoveries';
import {
  extractValue,
  isDuplicateRecord,
  findRecordIndex,
  transformFormToRecord,
  normalizeRecordName,
} from '@/utils/helpers/dns-record.helper';

// =============================================================================
// Error Classes
// =============================================================================

export class DnsRecordError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'DnsRecordError';
  }
}

export class DuplicateRecordError extends DnsRecordError {
  constructor(reason: string) {
    super('Duplicate record detected', 'DUPLICATE_RECORD', { reason });
  }
}

export class RecordNotFoundError extends DnsRecordError {
  constructor(message: string) {
    super(message, 'RECORD_NOT_FOUND');
  }
}

export class RecordSetNotFoundError extends DnsRecordError {
  constructor(recordSetId: string) {
    super(`RecordSet ${recordSetId} not found`, 'RECORDSET_NOT_FOUND', { recordSetId });
  }
}

// =============================================================================
// Types
// =============================================================================

export interface BulkImportOptions {
  skipDuplicates?: boolean;
  mergeStrategy?: 'append' | 'replace';
}

export interface ImportRecordDetail {
  recordType: string;
  name: string;
  value: string;
  ttl?: number;
  action: 'created' | 'updated' | 'skipped' | 'failed';
  message?: string;
}

export interface ImportResult {
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

interface RecordSetResolution {
  exists: boolean;
  recordSet?: DnsRecordSet;
}

interface DuplicateCheck {
  isDuplicate: boolean;
  reason?: string;
}

interface MergeResult {
  merged: any[];
  details: ImportRecordDetail[];
  counts: {
    created: number;
    updated: number;
    skipped: number;
  };
}

// =============================================================================
// DnsRecordManager
// =============================================================================

export class DnsRecordManager {
  constructor(private service: DnsRecordService) {}

  // ===========================================================================
  // Public API
  // ===========================================================================

  /**
   * Add a single record to a zone
   * Automatically creates RecordSet if needed, or appends to existing
   */
  async addRecord(
    projectId: string,
    zoneId: string,
    record: CreateDnsRecordSchema,
    options?: { dryRun?: boolean }
  ): Promise<{ recordSet: DnsRecordSet; action: 'created' | 'appended' }> {
    const startTime = Date.now();

    try {
      // Transform form data to K8s record format
      const transformed = transformFormToRecord(record);

      // Resolve the RecordSet that already owns this (type, name) pair
      const resolution = await this.resolveRecordSet(
        projectId,
        zoneId,
        record.recordType,
        transformed.name
      );

      if (resolution.exists && resolution.recordSet) {
        // Check for duplicate
        const dupCheck = this.checkDuplicates(
          transformed,
          resolution.recordSet.records || [],
          record.recordType
        );
        if (dupCheck.isDuplicate) {
          throw new DuplicateRecordError(dupCheck.reason || 'Record already exists');
        }

        // Append to existing RecordSet
        const updated = [...(resolution.recordSet.records || []), transformed];
        const recordSet = await this.service.update(
          projectId,
          resolution.recordSet.name,
          { records: updated },
          options
        );

        logger.info('DNS record appended to existing RecordSet', {
          projectId,
          zoneId,
          recordType: record.recordType,
          recordSetName: resolution.recordSet.name,
          duration: Date.now() - startTime,
        });

        return { recordSet, action: 'appended' };
      } else {
        // Create new RecordSet
        const recordSet = await this.service.create(
          projectId,
          {
            dnsZoneRef: { name: zoneId },
            recordType: record.recordType as any,
            records: [transformed],
          },
          options
        );

        logger.info('DNS record created with new RecordSet', {
          projectId,
          zoneId,
          recordType: record.recordType,
          recordSetName: recordSet.name,
          duration: Date.now() - startTime,
        });

        return { recordSet, action: 'created' };
      }
    } catch (error) {
      logger.error('Failed to add DNS record', error as Error, {
        projectId,
        zoneId,
        recordType: record.recordType,
      });
      throw error;
    }
  }

  /**
   * Update a single record within a RecordSet
   */
  async updateRecord(
    projectId: string,
    recordSetId: string,
    criteria: {
      recordType: string;
      name: string;
      oldValue?: string;
      oldTTL?: number | null;
    },
    newRecord: CreateDnsRecordSchema,
    options?: { dryRun?: boolean }
  ): Promise<DnsRecordSet> {
    const startTime = Date.now();

    try {
      // Get existing RecordSet
      const recordSet = await this.service.get(projectId, recordSetId);

      // Find the record to update
      const recordIndex = findRecordIndex(recordSet.records || [], criteria.recordType, {
        name: criteria.name,
        value: criteria.oldValue,
        ttl: criteria.oldTTL,
      });

      if (recordIndex === -1) {
        throw new RecordNotFoundError(
          `Record with name "${criteria.name}"${criteria.oldValue ? `, value "${criteria.oldValue}"` : ''}${criteria.oldTTL !== undefined ? `, and TTL "${criteria.oldTTL}"` : ''} not found`
        );
      }

      // Transform new form data to K8s format
      const transformed = transformFormToRecord(newRecord);

      // Replace the matching record
      const updated = (recordSet.records || []).map((r: any, i: number) =>
        i === recordIndex ? transformed : r
      );

      const result = await this.service.update(
        projectId,
        recordSetId,
        { records: updated },
        options
      );

      logger.info('DNS record updated', {
        projectId,
        recordSetId,
        recordType: criteria.recordType,
        recordName: criteria.name,
        duration: Date.now() - startTime,
      });

      return result;
    } catch (error) {
      logger.error('Failed to update DNS record', error as Error, {
        projectId,
        recordSetId,
        criteria,
      });
      throw error;
    }
  }

  /**
   * Remove a single record from a RecordSet
   * Deletes entire RecordSet if it's the last record
   */
  async removeRecord(
    projectId: string,
    criteria: DeleteDnsRecordInput
  ): Promise<{ action: 'recordRemoved' | 'recordSetDeleted' }> {
    const startTime = Date.now();

    try {
      // Get the RecordSet
      const recordSet = await this.service.get(projectId, criteria.recordSetName);
      const records = recordSet.records || [];

      // Find the record to delete
      const recordIndex = findRecordIndex(records, criteria.recordType, {
        name: criteria.name,
        value: criteria.value,
        ttl: criteria.ttl === null ? null : criteria.ttl,
      });

      if (recordIndex === -1) {
        throw new RecordNotFoundError(
          `Record not found: ${criteria.name} (${criteria.recordType})`
        );
      }

      // Remove the record from the array
      const remaining = records.filter((_, i) => i !== recordIndex);

      if (remaining.length === 0) {
        // Last record - DELETE the entire RecordSet
        await this.service.delete(projectId, criteria.recordSetName);

        logger.info('DNS RecordSet deleted (last record removed)', {
          projectId,
          recordSetName: criteria.recordSetName,
          recordType: criteria.recordType,
          duration: Date.now() - startTime,
        });

        return { action: 'recordSetDeleted' };
      } else {
        // More records remain - PATCH to remove just this record
        await this.service.update(projectId, criteria.recordSetName, { records: remaining });

        logger.info('DNS record removed from RecordSet', {
          projectId,
          recordSetName: criteria.recordSetName,
          recordType: criteria.recordType,
          recordName: criteria.name,
          remainingRecords: remaining.length,
          duration: Date.now() - startTime,
        });

        return { action: 'recordRemoved' };
      }
    } catch (error) {
      logger.error('Failed to remove DNS record', error as Error, {
        projectId,
        criteria,
      });
      throw error;
    }
  }

  /**
   * Bulk import records with duplicate detection and merge strategies
   */
  async bulkImport(
    projectId: string,
    zoneId: string,
    records: IDnsZoneDiscoveryRecordSet[],
    options: BulkImportOptions = {}
  ): Promise<ImportResult> {
    const startTime = Date.now();

    const opts: Required<BulkImportOptions> = {
      skipDuplicates: options.skipDuplicates ?? true,
      mergeStrategy: options.mergeStrategy ?? 'append',
    };

    const summary = {
      totalRecordSets: records.length,
      totalRecords: 0,
      created: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
    };

    const allDetails: ImportRecordDetail[] = [];

    try {
      // Group by (type, name) so each owner name resolves independently
      const grouped = this.groupByTypeAndName(records);

      // Process each (type, name) group sequentially (prevents race conditions)
      for (const { recordType, name, records: namedRecords } of grouped.values()) {
        summary.totalRecords += namedRecords.length;

        try {
          const resolution = await this.resolveRecordSet(projectId, zoneId, recordType, name);

          const { merged, details, counts } = this.mergeRecords(
            resolution.recordSet?.records || [],
            namedRecords,
            recordType,
            name,
            opts,
            !resolution.exists
          );

          const hasChanges =
            merged.length > (resolution.recordSet?.records?.length || 0) ||
            opts.mergeStrategy === 'replace';

          if (hasChanges) {
            if (resolution.exists && resolution.recordSet) {
              await this.service.update(projectId, resolution.recordSet.name, { records: merged });
            } else {
              await this.service.create(projectId, {
                dnsZoneRef: { name: zoneId },
                recordType: recordType as any,
                records: merged,
              });
            }
          }

          allDetails.push(...details);
          summary.created += counts.created;
          summary.updated += counts.updated;
          summary.skipped += counts.skipped;
        } catch (error: any) {
          for (const record of namedRecords) {
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

      logger.info('Bulk DNS import completed', {
        projectId,
        zoneId,
        summary,
        duration: Date.now() - startTime,
      });

      return { summary, details: allDetails };
    } catch (error) {
      logger.error('Failed to bulk import DNS records', error as Error, {
        projectId,
        zoneId,
      });
      throw error;
    }
  }

  // ===========================================================================
  // Private Helper Methods
  // ===========================================================================

  /**
   * Resolve the RecordSet that owns this (type, name) pair in the zone.
   * A zone can have multiple RecordSets of the same type at different names.
   */
  private async resolveRecordSet(
    projectId: string,
    zoneId: string,
    recordType: string,
    name: string
  ): Promise<RecordSetResolution> {
    const candidates = await this.service.listByTypeAndZone(projectId, zoneId, recordType);
    const existing = this.findOwningRecordSet(candidates, name);
    return existing ? { exists: true, recordSet: existing } : { exists: false };
  }

  /**
   * Find the RecordSet whose records[] include the target owner name
   */
  private findOwningRecordSet(recordSets: DnsRecordSet[], name: string): DnsRecordSet | undefined {
    const target = normalizeRecordName(name);
    return recordSets.find((recordSet) =>
      (recordSet.records || []).some((record) => normalizeRecordName(record.name) === target)
    );
  }

  /**
   * Check if a record is a duplicate of any existing record
   */
  private checkDuplicates(
    newRecord: any,
    existingRecords: any[],
    recordType: string
  ): DuplicateCheck {
    const isDuplicate = isDuplicateRecord(newRecord, existingRecords, recordType);
    return {
      isDuplicate,
      reason: isDuplicate ? 'Record already exists' : undefined,
    };
  }

  /**
   * Merge incoming records with existing records based on strategy.
   * Replace only swaps entries at the group's owner name so other names
   * already on the same RecordSet are left intact.
   */
  private mergeRecords(
    existingRecords: any[],
    incomingRecords: any[],
    recordType: string,
    groupName: string,
    options: Required<BulkImportOptions>,
    isNewRecordSet: boolean
  ): MergeResult {
    const details: ImportRecordDetail[] = [];
    const counts = { created: 0, updated: 0, skipped: 0 };

    if (options.mergeStrategy === 'replace') {
      const target = normalizeRecordName(groupName);
      const kept = existingRecords.filter((record) => normalizeRecordName(record.name) !== target);
      for (const record of incomingRecords) {
        const value = extractValue(record, recordType);
        details.push({
          recordType,
          name: record.name,
          value,
          ttl: record.ttl,
          action: isNewRecordSet ? 'created' : 'updated',
          message: isNewRecordSet ? 'Created new record' : 'Replaced existing record',
        });
        if (isNewRecordSet) {
          counts.created++;
        } else {
          counts.updated++;
        }
      }
      return { merged: [...kept, ...incomingRecords], details, counts };
    }

    // Append strategy: merge with duplicate detection
    const merged = [...existingRecords];

    for (const newRecord of incomingRecords) {
      const value = extractValue(newRecord, recordType);
      const dupCheck = this.checkDuplicates(newRecord, merged, recordType);

      if (dupCheck.isDuplicate && options.skipDuplicates) {
        details.push({
          recordType,
          name: newRecord.name,
          value,
          ttl: newRecord.ttl,
          action: 'skipped',
          message: 'Duplicate record skipped',
        });
        counts.skipped++;
      } else {
        merged.push(newRecord);
        const action = isNewRecordSet ? 'created' : 'updated';
        details.push({
          recordType,
          name: newRecord.name,
          value,
          ttl: newRecord.ttl,
          action,
          message: isNewRecordSet ? 'Created new record' : 'Added to existing RecordSet',
        });
        if (isNewRecordSet) {
          counts.created++;
        } else {
          counts.updated++;
        }
      }
    }

    return { merged, details, counts };
  }

  /**
   * Group discovery records by (recordType, normalized owner name)
   */
  private groupByTypeAndName(
    discoveryRecordSets: IDnsZoneDiscoveryRecordSet[]
  ): Map<string, { recordType: string; name: string; records: any[] }> {
    const grouped = new Map<string, { recordType: string; name: string; records: any[] }>();

    for (const recordSet of discoveryRecordSets) {
      const { recordType, records } = recordSet;
      if (!recordType || !records) continue;

      for (const record of records) {
        const name = normalizeRecordName(record.name);
        const key = `${recordType}::${name}`;
        const existing = grouped.get(key);
        if (existing) {
          existing.records.push(record);
        } else {
          grouped.set(key, { recordType, name, records: [record] });
        }
      }
    }

    return grouped;
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a DnsRecordManager instance
 */
export function createDnsRecordManager(): DnsRecordManager {
  const service = createDnsRecordService();
  return new DnsRecordManager(service);
}
