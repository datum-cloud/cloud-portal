// =============================================================================
// Bulk Import Types and Helpers
// =============================================================================

/**
 * Individual record import detail
 * Each record in the import gets its own detail entry
 */
export interface ImportDetail {
  recordType: string;
  name: string;
  value: string;
  ttl?: number;
  action: 'created' | 'updated' | 'skipped' | 'failed';
  message?: string;
}

export interface ImportSummary {
  totalRecordSets: number;
  totalRecords: number;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
}

export interface ImportResult {
  summary: ImportSummary;
  details: ImportDetail[];
}

/**
 * Compute record counts from details array
 */
export function computeRecordCounts(details: ImportDetail[]): {
  created: number;
  updated: number;
  skipped: number;
  failed: number;
} {
  return details.reduce(
    (acc, detail) => {
      switch (detail.action) {
        case 'created':
          acc.created++;
          break;
        case 'updated':
          acc.updated++;
          break;
        case 'skipped':
          acc.skipped++;
          break;
        case 'failed':
          acc.failed++;
          break;
      }
      return acc;
    },
    { created: 0, updated: 0, skipped: 0, failed: 0 }
  );
}

/**
 * Get import result status based on counts
 */
export function getImportResultStatus(
  details: ImportDetail[]
): 'success' | 'warning' | 'error' | 'info' {
  const { created, updated, skipped, failed } = computeRecordCounts(details);
  const importedCount = created + updated + skipped;

  if (failed === 0 && importedCount > 0) {
    return 'success';
  } else if (importedCount > 0 && failed > 0) {
    return 'warning';
  } else if (failed > 0 && importedCount === 0) {
    return 'error';
  }
  return 'info';
}
