export {
  ELIGIBLE_PROTECT_RECORD_TYPES,
  isEligibleForProtect,
  isRowLocked,
  normalizeEndpoint,
  findProxyByEndpoint,
  findProxyForRecord,
} from './proxy-match';
export {
  canBulkDelete,
  describeSkipped,
  planBulkDelete,
  type BulkDeleteGroup,
  type BulkDeletePlan,
  type SkippedRecord,
} from './bulk-delete';
