// =============================================================================
// DNS Record Helpers
// Re-exports from modular dns/ directory for backward compatibility
// =============================================================================

export {
  // Constants
  SUPPORTED_DNS_RECORD_TYPES,
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

  // Flatten helpers
  flattenDnsRecordSets,
  extractValue,
  isRecordEmpty,

  // Form transform helpers
  transformFormToRecord,
  recordToFormDefaultValue,

  // BIND import helpers
  parseBindZoneFile,
  transformParsedToFlattened,
  transformParsedToRecordSets,
  readFileAsText,
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
} from './dns';
