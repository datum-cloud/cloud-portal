// =============================================================================
// DNS Record Helpers - Barrel Export
// =============================================================================

// Constants
export {
  SUPPORTED_DNS_RECORD_TYPES,
  SUPPORTED_DNS_RECORD_TYPES_SET,
  type SupportedDnsRecordType,
} from './constants';

// Nameserver helpers
export { getNameserverSetupStatus, type INameserverSetupStatus } from './nameserver.helper';

// DNS setup validation helpers
export { getDnsSetupStatus, type IDnsSetupStatus, type IDnsSetupRule } from './dns-setup.helper';

// Record type helpers
export {
  getDnsRecordTypePriority,
  formatTTL,
  parseSvcbParams,
  formatSvcbParams,
  normalizeQuotedValue,
  normalizeTxtValue,
  normalizeCaaValue,
  // FQDN normalization helpers
  FQDN_FIELDS,
  ensureFqdn,
  getFqdnFields,
  hasFqdnFields,
  transformFqdnFields,
} from './record-type.helper';

// Flatten helpers
export { flattenDnsRecordSets, extractValue, isRecordEmpty } from './flatten.helper';

// Record comparison helpers
export {
  normalizeDomainName,
  normalizeRecordName,
  isDuplicateRecord,
  findRecordIndex,
} from './record-comparison.helper';

// Form transform helpers
export { transformFormToRecord, recordToFormDefaultValue } from './form-transform.helper';

// BIND import helpers
export {
  parseBindZoneFile,
  deduplicateParsedRecords,
  transformParsedToFlattened,
  transformParsedToRecordSets,
  type ParsedDnsRecord,
  type BindParseResult,
} from './bind-import.helper';

// BIND export helpers
export { generateBindZoneFile, transformRecordsToBindFormat } from './bind-export.helper';

// Import result helpers
export {
  computeRecordCounts,
  getImportResultStatus,
  type ImportDetail,
  type ImportSummary,
  type ImportResult,
} from './import-result.helper';
