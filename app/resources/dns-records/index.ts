// Schema exports
export {
  dnsRecordSetResourceSchema,
  dnsRecordSetListSchema,
  flattenedDnsRecordSchema,
  type DnsRecordSet,
  type DnsRecordSetList,
  type FlattenedDnsRecord,
  type IFlattenedDnsRecord,
  type IDnsRecordSetControlResponse,
  type CreateDnsRecordSetInput,
  type UpdateDnsRecordSetInput,
  SUPPORTED_DNS_RECORD_TYPES,
  type SupportedDnsRecordType,

  // DNS Record Types and TTL
  DNS_RECORD_TYPES,
  type DNSRecordType,
  TTL_OPTIONS,

  // Base schema
  baseRecordFieldSchema,

  // Type-specific record data schemas
  aRecordDataSchema,
  aaaaRecordDataSchema,
  aliasRecordDataSchema,
  cnameRecordDataSchema,
  txtRecordDataSchema,
  mxRecordDataSchema,
  srvRecordDataSchema,
  caaRecordDataSchema,
  nsRecordDataSchema,
  soaRecordDataSchema,
  ptrRecordDataSchema,
  tlsaRecordDataSchema,
  httpsRecordDataSchema,
  svcbRecordDataSchema,

  // Combined record schemas (base + type-specific)
  aRecordSchema,
  aaaaRecordSchema,
  aliasRecordSchema,
  cnameRecordSchema,
  txtRecordSchema,
  mxRecordSchema,
  srvRecordSchema,
  caaRecordSchema,
  nsRecordSchema,
  soaRecordSchema,
  ptrRecordSchema,
  tlsaRecordSchema,
  httpsRecordSchema,
  svcbRecordSchema,

  // Main validation schemas
  dnsRecordSetSchema,
  createDnsRecordSchema,
  updateDnsRecordSchema,

  // Type exports for record schemas
  type ARecordSchema,
  type AAAARecordSchema,
  type ALIASRecordSchema,
  type CNAMERecordSchema,
  type TXTRecordSchema,
  type MXRecordSchema,
  type SRVRecordSchema,
  type CAARecordSchema,
  type NSRecordSchema,
  type SOARecordSchema,
  type PTRRecordSchema,
  type TLSARecordSchema,
  type HTTPSRecordSchema,
  type SVCBRecordSchema,
  type CreateDnsRecordSchema,
  type UpdateDnsRecordSchema,
  type DnsRecordSetSchema,
} from './dns-record.schema';

// Adapter exports
export {
  toDnsRecordSet,
  toDnsRecordSetList,
  toFlattenedDnsRecords,
  toFlattenedDnsRecordsByPriority,
  toCreateDnsRecordSetPayload,
  toUpdateDnsRecordSetPayload,
} from './dns-record.adapter';

// Service exports
export { createDnsRecordService, dnsRecordKeys, type DnsRecordService } from './dns-record.service';

// Manager exports
export {
  createDnsRecordManager,
  DnsRecordManager,
  DnsRecordError,
  DuplicateRecordError,
  RecordNotFoundError,
  RecordSetNotFoundError,
  type ImportResult,
} from './dns-record.manager';

// Query hooks exports
export {
  useDnsRecords,
  useDnsRecord,
  useCreateDnsRecord,
  useUpdateDnsRecord,
  useDeleteDnsRecord,
  useBulkImportDnsRecords,
  useHydrateDnsRecords,
  useHydrateDnsRecord,
  type BulkImportOptions,
  type BulkImportInput,
  type ImportRecordDetail,
  type UpdateDnsRecordInput,
  type DeleteDnsRecordInput,
} from './dns-record.queries';

// Watch hooks exports
export { useDnsRecordsWatch, useDnsRecordWatch } from './dns-record.watch';
