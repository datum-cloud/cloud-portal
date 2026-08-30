import { createHash } from 'node:crypto';

/** Amberflo's documented meterApiName length cap. */
const AMBERFLO_METER_API_NAME_MAX = 50;

/**
 * Amberflo meterApiName used by amberflo-provider ingest and meters.
 *
 * `MeterDefinition.metadata.name` passes through when it fits. Names
 * longer than 50 characters are hashed to hex SHA-1 (40 chars), matching
 * `amberflo.MeterAPIName` in amberflo-provider.
 */
export function amberfloMeterApiName(definitionName: string): string {
  if (!definitionName) return '';
  if (definitionName.length <= AMBERFLO_METER_API_NAME_MAX) {
    return definitionName;
  }
  return createHash('sha1').update(definitionName).digest('hex');
}
