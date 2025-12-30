// =============================================================================
// DNS Record Helpers
// Re-exports from modular dns/ directory for backward compatibility
// =============================================================================

export {
  // Constants
  SUPPORTED_DNS_RECORD_TYPES,
  SUPPORTED_DNS_RECORD_TYPES_SET,
  type SupportedDnsRecordType,

  // Nameserver helpers
  getNameserverSetupStatus,
  type INameserverSetupStatus,

  // DNS setup validation helpers
  getDnsSetupStatus,
  type IDnsSetupStatus,
  type IDnsSetupRule,

  // Record type helpers
  getDnsRecordTypePriority,
  formatTTL,
  parseSvcbParams,
  formatSvcbParams,
  // FQDN normalization helpers
  FQDN_FIELDS,
  ensureFqdn,
  getFqdnFields,
  hasFqdnFields,
  transformFqdnFields,

  // Flatten helpers
  flattenDnsRecordSets,
  extractValue,
  isRecordEmpty,

  // Record comparison helpers
  normalizeDomainName,
  normalizeRecordName,
  isDuplicateRecord,
  findRecordIndex,

  // Form transform helpers
  transformFormToRecord,
  recordToFormDefaultValue,

  // BIND import helpers
  parseBindZoneFile,
  deduplicateParsedRecords,
  transformParsedToFlattened,
  transformParsedToRecordSets,
  type ParsedDnsRecord,
  type BindParseResult,

  // BIND export helpers
  generateBindZoneFile,
  transformRecordsToBindFormat,

  // Import result helpers
  computeRecordCounts,
  getImportResultStatus,
  type ImportDetail,
  type ImportSummary,
  type ImportResult,

  // Error formatting helpers
  formatDnsConflictError,
  formatDnsError,
} from './dns';
