// =============================================================================
// DNS Record Helpers - Barrel Export
// =============================================================================

// Constants - Single source of truth for DNS record types
export {
  DNS_RECORD_TYPES,
  DNS_RECORD_TYPES_SET,
  SUPPORTED_DNS_RECORD_TYPES,
  SUPPORTED_DNS_RECORD_TYPES_SET,
  type DNSRecordType,
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
  deduplicateParsedRecords,
  transformApexCnameToAlias,
  transformParsedToFlattened,
  transformParsedToRecordSets,
  transformFlattenedToRecordSets,
  type ApexCnameTransformResult,
} from './bind-import.helper';

// BIND parser helpers
export { parseBindZoneFile, type BindParseResult, type ParsedDnsRecord } from './bind-parser';

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

// Error formatting helpers
export { formatDnsConflictError, formatDnsError } from './error-formatting.helper';

// Record type configuration
export {
  DNS_RECORD_TYPE_CONFIG,
  getRecordTypeConfig,
  getRecordFieldConfig,
  getDnsRecordTypeSelectOptions,
  type DnsRecordTypeConfig,
  type DnsRecordFieldConfig,
} from './record-type-config';
