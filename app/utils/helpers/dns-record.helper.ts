import { ComMiloapisNetworkingDnsV1Alpha1DnsRecordSet } from '@/modules/control-plane/dns-networking';
import { IDnsRecordSetControlResponse } from '@/resources/interfaces/dns.interface';
import { CreateDnsRecordSchema } from '@/resources/schemas/dns-record.schema';

/**
 * Get sort priority for DNS record types
 * Lower numbers appear first in sorted lists
 */
export function getDnsRecordTypePriority(recordType: string): number {
  const priorities: Record<string, number> = {
    SOA: 1,
    NS: 2,
    A: 3,
    AAAA: 4,
    CNAME: 5,
    MX: 6,
    TXT: 7,
    SRV: 8,
    CAA: 9,
    PTR: 10,
    TLSA: 11,
    HTTPS: 12,
    SVCB: 13,
  };

  return priorities[recordType] || 999;
}

/**
 * Convert TTL (in seconds) to human-readable format
 * Examples: 3600 -> "1 hr", 300 -> "5 min", 86400 -> "1 day"
 */
export function formatTTL(ttlSeconds?: number): string {
  if (!ttlSeconds) return 'Auto';

  const days = Math.floor(ttlSeconds / 86400);
  const hours = Math.floor((ttlSeconds % 86400) / 3600);
  const minutes = Math.floor((ttlSeconds % 3600) / 60);
  const seconds = ttlSeconds % 60;

  const parts: string[] = [];

  if (days > 0) parts.push(`${days} day${days > 1 ? 's' : ''}`);
  if (hours > 0) parts.push(`${hours} hr${hours > 1 ? 's' : ''}`);
  if (minutes > 0) parts.push(`${minutes} min${minutes > 1 ? 's' : ''}`);
  if (seconds > 0 && parts.length === 0) parts.push(`${seconds} sec${seconds > 1 ? 's' : ''}`);

  // Return first two most significant units
  return parts.slice(0, 2).join(' ');
}

/**
 * Flattened DNS record for UI display
 * Each VALUE in each record becomes a separate row
 */
export interface IFlattenedDnsRecord {
  // RecordSet metadata
  recordSetId: string;
  recordSetName: string;
  createdAt: Date;
  dnsZoneId: string;

  // Record details
  type: string; // Record type (NS, A, AAAA, CNAME, MX, etc.)
  name: string; // Record name (recordSet name, not record.name)
  value: string; // Single value (MX format: "preference|exchange")
  ttl?: number; // TTL if available

  // Status
  status: 'Active' | 'Pending' | 'Error';

  // Raw data for editing
  rawData: any;
}

/**
 * Transform K8s DNSRecordSet array to flattened records for UI display
 * Each value in spec.records[].raw/soa/mx/etc becomes a separate table row
 */
export function flattenDnsRecordSets(
  recordSets: IDnsRecordSetControlResponse[]
): IFlattenedDnsRecord[] {
  const flattened: IFlattenedDnsRecord[] = [];

  recordSets.forEach((recordSet) => {
    const records = recordSet.records || [];
    const status = extractStatus(recordSet.status);

    records.forEach((record: any) => {
      const values = extractValues(record, recordSet.recordType);
      const ttl = extractTTL(record);

      // Create one row per value
      values.forEach((value) => {
        flattened.push({
          recordSetId: recordSet.uid || '',
          recordSetName: recordSet.name || '',
          createdAt: recordSet.createdAt || new Date(),
          dnsZoneId: recordSet.dnsZoneId || '',
          type: recordSet.recordType || '',
          name: record.name || '',
          value: value,
          ttl: ttl,
          status: status,
          rawData: record,
        });
      });
    });
  });

  // Sort descending by createdAt (most recent first), then by name for same timestamp
  return flattened.sort((a, b) => {
    const dateA = new Date(a.createdAt).getTime();
    const dateB = new Date(b.createdAt).getTime();
    if (dateA !== dateB) {
      return dateB - dateA;
    }
    return a.name.localeCompare(b.name);
  });

  // Sort by type priority, then by name
  // return flattened.sort((a, b) => {
  //   const priorityDiff = getDnsRecordTypePriority(a.type) - getDnsRecordTypePriority(b.type);
  //   if (priorityDiff !== 0) return priorityDiff;
  //   return a.name.localeCompare(b.name);
  // });
}

/**
 * Extract values from different record types based on K8s schema
 * Returns array of strings, each will become a separate row
 * Reference: ComMiloapisNetworkingDnsV1Alpha1DnsRecordSet['spec']['records']
 */
function extractValues(record: any, recordType: string | undefined): string[] {
  switch (recordType) {
    case 'A':
      // record.a.content: Array<string>
      return record.a?.content || [];

    case 'AAAA':
      // record.aaaa.content: Array<string>
      return record.aaaa?.content || [];

    case 'CNAME':
      // record.cname.content: string (single value, not array)
      return record.cname?.content ? [record.cname.content] : [];

    case 'TXT':
      // record.txt.content: Array<string>
      return record.txt?.content || [];

    case 'NS':
    case 'PTR':
      // record.raw: Array<string>
      return record.raw || [];

    case 'SOA':
      // record.soa: { mname, rname, refresh, retry, expire, serial, ttl }
      // Return as JSON string to preserve object structure for editing
      // Format will be applied in table cell renderer
      if (record.soa) {
        return [JSON.stringify(record.soa)];
      }
      return [];

    case 'MX':
      // record.mx: Array<{ exchange: string, preference: number }>
      // Format: "preference|exchange" (pipe separator for UI parsing)
      if (record.mx) {
        return record.mx.map((mx: any) => `${mx.preference}|${mx.exchange}`);
      }
      return [];

    case 'SRV':
      // record.srv: Array<{ priority, weight, port, target }>
      // Format: "priority weight port target"
      if (record.srv) {
        return record.srv.map(
          (srv: any) => `${srv.priority} ${srv.weight} ${srv.port} ${srv.target}`
        );
      }
      return [];

    case 'CAA':
      // record.caa: Array<{ flag, tag, value }>
      // Format: "flag tag value"
      if (record.caa) {
        return record.caa.map((caa: any) => `${caa.flag} ${caa.tag} "${caa.value}"`);
      }
      return [];

    case 'TLSA':
      // record.tlsa: Array<{ usage, selector, matchingType, certData }>
      // Format: "usage selector matchingType certData"
      if (record.tlsa) {
        return record.tlsa.map(
          (tlsa: any) => `${tlsa.usage} ${tlsa.selector} ${tlsa.matchingType} ${tlsa.certData}`
        );
      }
      return [];

    case 'HTTPS':
      // record.https: Array<{ priority, target, params }>
      // Format: "priority target [params]"
      if (record.https) {
        return record.https.map((https: any) => {
          const params = https.params
            ? ` ${Object.entries(https.params)
                .map(([k, v]) => `${k}=${v}`)
                .join(' ')}`
            : '';
          return `${https.priority} ${https.target}${params}`;
        });
      }
      return [];

    case 'SVCB':
      // record.svcb: Array<{ priority, target, params }>
      // Format: "priority target [params]"
      if (record.svcb) {
        return record.svcb.map((svcb: any) => {
          const params = svcb.params
            ? ` ${Object.entries(svcb.params)
                .map(([k, v]) => `${k}=${v}`)
                .join(' ')}`
            : '';
          return `${svcb.priority} ${svcb.target}${params}`;
        });
      }
      return [];

    default:
      // Fallback to raw if available
      return record.raw || [];
  }
}

/**
 * Extract TTL from record
 */
function extractTTL(record: any): number | undefined {
  // SOA has TTL in soa.ttl
  // if (record.soa?.ttl) return record.soa.ttl;

  // Other types might have TTL at record level
  if (record.ttl) return record.ttl;

  return undefined;
}

/**
 * Extract status from K8s conditions
 */
function extractStatus(status: any): 'Active' | 'Pending' | 'Error' {
  if (!status?.conditions) return 'Pending';

  const accepted = status.conditions.find((c: any) => c.type === 'Accepted');
  const programmed = status.conditions.find((c: any) => c.type === 'Programmed');

  const isAccepted = accepted?.status === 'True';
  const isProgrammed = programmed?.status === 'True';

  if (isAccepted && isProgrammed) return 'Active';
  if (accepted?.status === 'False' || programmed?.status === 'False') return 'Error';
  return 'Pending';
}

// =============================================================================
// Transformation Helpers: Form ↔ K8s RecordSet
// =============================================================================

/**
 * Transform UI form data to K8s Record format
 * Converts CreateDnsRecordSchema to DNSRecordSet['spec']['records'][0]
 */
export function transformFormToRecord(
  formData: CreateDnsRecordSchema
): ComMiloapisNetworkingDnsV1Alpha1DnsRecordSet['spec']['records'][0] {
  const { recordType, name, ttl, ...typeData } = formData as any;

  const record: any = {
    name: name || '@',
    // Only include ttl if it's not null/undefined (null means "Auto" - use default TTL)
    ...(ttl != null && { ttl }),
  };

  // Map type-specific fields to K8s format
  switch (recordType) {
    case 'A':
      // Form: { a: { content: string } }
      // K8s:  { a: { content: string[] } }
      if (typeData.a) {
        record.a = { content: [typeData.a.content] };
      }
      break;

    case 'AAAA':
      if (typeData.aaaa) {
        record.aaaa = { content: [typeData.aaaa.content] };
      }
      break;

    case 'CNAME':
      // Form: { cname: { content: string } }
      // K8s:  { cname: { content: string } }
      if (typeData.cname) {
        record.cname = { content: typeData.cname.content };
      }
      break;

    case 'TXT':
      if (typeData.txt) {
        record.txt = { content: [typeData.txt.content] };
      }
      break;

    case 'NS':
      // Form: { ns: { content: string } }
      // K8s:  { raw: string[] }
      if (typeData.ns) {
        record.raw = [typeData.ns.content];
      }
      break;

    case 'PTR':
      if (typeData.ptr) {
        record.raw = [typeData.ptr.content];
      }
      break;

    case 'MX':
      // Form: { mx: [{ exchange, preference }] }
      // K8s:  { mx: [{ exchange, preference }] }
      if (typeData.mx) {
        record.mx = typeData.mx;
      }
      break;

    case 'SRV':
      if (typeData.srv) {
        record.srv = typeData.srv;
      }
      break;

    case 'CAA':
      if (typeData.caa) {
        record.caa = typeData.caa;
      }
      break;

    case 'TLSA':
      if (typeData.tlsa) {
        record.tlsa = typeData.tlsa;
      }
      break;

    case 'HTTPS':
      if (typeData.https) {
        record.https = typeData.https;
      }
      break;

    case 'SVCB':
      if (typeData.svcb) {
        record.svcb = typeData.svcb;
      }
      break;

    case 'SOA':
      // Form: { soa: { mname, rname, ... } }
      // K8s:  { soa: { mname, rname, ... } }
      if (typeData.soa) {
        record.soa = typeData.soa;
      }
      break;
  }

  return record;
}

/**
 * Merge new record values into existing record
 * For types with content arrays (A, AAAA, TXT, NS, PTR), merges the arrays
 * For types with object arrays (MX, SRV, CAA, etc.), appends to the array
 * For single-value types (CNAME, SOA), replaces the value
 */
export function mergeRecordValues(existingRecord: any, newRecord: any, recordType: string): any {
  const merged = { ...existingRecord };

  switch (recordType) {
    case 'A':
      // Merge content arrays, avoiding duplicates
      if (newRecord.a?.content && existingRecord.a?.content) {
        const existingContent = existingRecord.a.content;
        const newContent = newRecord.a.content;
        merged.a = {
          content: [
            ...existingContent,
            ...newContent.filter((ip: string) => !existingContent.includes(ip)),
          ],
        };
      } else if (newRecord.a) {
        merged.a = newRecord.a;
      }
      break;

    case 'AAAA':
      if (newRecord.aaaa?.content && existingRecord.aaaa?.content) {
        const existingContent = existingRecord.aaaa.content;
        const newContent = newRecord.aaaa.content;
        merged.aaaa = {
          content: [
            ...existingContent,
            ...newContent.filter((ip: string) => !existingContent.includes(ip)),
          ],
        };
      } else if (newRecord.aaaa) {
        merged.aaaa = newRecord.aaaa;
      }
      break;

    case 'TXT':
      if (newRecord.txt?.content && existingRecord.txt?.content) {
        const existingContent = existingRecord.txt.content;
        const newContent = newRecord.txt.content;
        merged.txt = {
          content: [
            ...existingContent,
            ...newContent.filter((text: string) => !existingContent.includes(text)),
          ],
        };
      } else if (newRecord.txt) {
        merged.txt = newRecord.txt;
      }
      break;

    case 'NS':
    case 'PTR':
      if (newRecord.raw && existingRecord.raw) {
        const existingRaw = existingRecord.raw;
        const newRaw = newRecord.raw;
        merged.raw = [
          ...existingRaw,
          ...newRaw.filter((value: string) => !existingRaw.includes(value)),
        ];
      } else if (newRecord.raw) {
        merged.raw = newRecord.raw;
      }
      break;

    case 'MX':
      // Append to array, check for duplicates by exchange
      if (newRecord.mx && existingRecord.mx) {
        const existingExchanges = existingRecord.mx.map((mx: any) => mx.exchange);
        const newMx = newRecord.mx.filter((mx: any) => !existingExchanges.includes(mx.exchange));
        merged.mx = [...existingRecord.mx, ...newMx];
      } else if (newRecord.mx) {
        merged.mx = newRecord.mx;
      }
      break;

    case 'SRV':
      // Append to array, check for duplicates by target
      if (newRecord.srv && existingRecord.srv) {
        const existingTargets = existingRecord.srv.map((srv: any) => srv.target);
        const newSrv = newRecord.srv.filter((srv: any) => !existingTargets.includes(srv.target));
        merged.srv = [...existingRecord.srv, ...newSrv];
      } else if (newRecord.srv) {
        merged.srv = newRecord.srv;
      }
      break;

    case 'CAA':
      // Append to array, check for duplicates by value
      if (newRecord.caa && existingRecord.caa) {
        const existingValues = existingRecord.caa.map((caa: any) => caa.value);
        const newCaa = newRecord.caa.filter((caa: any) => !existingValues.includes(caa.value));
        merged.caa = [...existingRecord.caa, ...newCaa];
      } else if (newRecord.caa) {
        merged.caa = newRecord.caa;
      }
      break;

    case 'TLSA':
      // Append to array, check for duplicates by certData
      if (newRecord.tlsa && existingRecord.tlsa) {
        const existingCerts = existingRecord.tlsa.map((tlsa: any) => tlsa.certData);
        const newTlsa = newRecord.tlsa.filter(
          (tlsa: any) => !existingCerts.includes(tlsa.certData)
        );
        merged.tlsa = [...existingRecord.tlsa, ...newTlsa];
      } else if (newRecord.tlsa) {
        merged.tlsa = newRecord.tlsa;
      }
      break;

    case 'HTTPS':
      // Append to array, check for duplicates by target
      if (newRecord.https && existingRecord.https) {
        const existingTargets = existingRecord.https.map((https: any) => https.target);
        const newHttps = newRecord.https.filter(
          (https: any) => !existingTargets.includes(https.target)
        );
        merged.https = [...existingRecord.https, ...newHttps];
      } else if (newRecord.https) {
        merged.https = newRecord.https;
      }
      break;

    case 'SVCB':
      // Append to array, check for duplicates by target
      if (newRecord.svcb && existingRecord.svcb) {
        const existingTargets = existingRecord.svcb.map((svcb: any) => svcb.target);
        const newSvcb = newRecord.svcb.filter(
          (svcb: any) => !existingTargets.includes(svcb.target)
        );
        merged.svcb = [...existingRecord.svcb, ...newSvcb];
      } else if (newRecord.svcb) {
        merged.svcb = newRecord.svcb;
      }
      break;

    case 'CNAME':
    case 'SOA':
      // Single-value types: replace entirely
      return { ...existingRecord, ...newRecord };

    default:
      // Fallback: replace entirely
      return { ...existingRecord, ...newRecord };
  }

  // Update TTL if provided in new record
  // If newRecord.ttl is null, it means "Auto" - don't include it (delete from merged)
  // If newRecord.ttl is a number, update it
  // If newRecord.ttl is undefined, keep existing TTL
  if (newRecord.ttl !== undefined) {
    if (newRecord.ttl === null) {
      delete merged.ttl; // Remove TTL to use default
    } else {
      merged.ttl = newRecord.ttl;
    }
  }

  return merged;
}

/**
 * Update a specific value in a record's value array
 * Used for editing individual values (e.g., changing one IP to another in A record)
 * @param record - The existing record
 * @param newRecord - The new record data containing the updated value
 * @param recordType - The DNS record type
 * @param oldValue - The old value to find and replace
 */
export function updateValueInRecord(
  record: any,
  newRecord: any,
  recordType: string,
  oldValue: string
): any {
  const updatedRecord = { ...record };

  switch (recordType) {
    case 'A':
      if (record.a?.content && newRecord.a?.content?.[0]) {
        const newValue = newRecord.a.content[0];
        updatedRecord.a = {
          content: record.a.content.map((ip: string) => (ip === oldValue ? newValue : ip)),
        };
      }
      break;

    case 'AAAA':
      if (record.aaaa?.content && newRecord.aaaa?.content?.[0]) {
        const newValue = newRecord.aaaa.content[0];
        updatedRecord.aaaa = {
          content: record.aaaa.content.map((ip: string) => (ip === oldValue ? newValue : ip)),
        };
      }
      break;

    case 'TXT':
      if (record.txt?.content && newRecord.txt?.content?.[0]) {
        const newValue = newRecord.txt.content[0];
        updatedRecord.txt = {
          content: record.txt.content.map((text: string) => (text === oldValue ? newValue : text)),
        };
      }
      break;

    case 'NS':
    case 'PTR':
      if (record.raw && newRecord.raw?.[0]) {
        const newValue = newRecord.raw[0];
        updatedRecord.raw = record.raw.map((value: string) =>
          value === oldValue ? newValue : value
        );
      }
      break;

    case 'MX':
      if (record.mx && newRecord.mx?.[0]) {
        const newMx = newRecord.mx[0];
        // oldValue format: "preference|exchange"
        updatedRecord.mx = record.mx.map((mx: any) =>
          `${mx.preference}|${mx.exchange}` === oldValue ? newMx : mx
        );
      }
      break;

    case 'SRV':
      if (record.srv && newRecord.srv?.[0]) {
        const newSrv = newRecord.srv[0];
        // oldValue format: "priority weight port target"
        updatedRecord.srv = record.srv.map((srv: any) =>
          `${srv.priority} ${srv.weight} ${srv.port} ${srv.target}` === oldValue ? newSrv : srv
        );
      }
      break;

    case 'CAA':
      if (record.caa && newRecord.caa?.[0]) {
        const newCaa = newRecord.caa[0];
        // oldValue format: "flag tag "value""
        updatedRecord.caa = record.caa.map((caa: any) =>
          `${caa.flag} ${caa.tag} "${caa.value}"` === oldValue ? newCaa : caa
        );
      }
      break;

    case 'TLSA':
      if (record.tlsa && newRecord.tlsa?.[0]) {
        const newTlsa = newRecord.tlsa[0];
        // oldValue is certData
        updatedRecord.tlsa = record.tlsa.map((tlsa: any) =>
          tlsa.certData === oldValue ? newTlsa : tlsa
        );
      }
      break;

    case 'HTTPS':
      if (record.https && newRecord.https?.[0]) {
        const newHttps = newRecord.https[0];
        // oldValue is the target
        updatedRecord.https = record.https.map((https: any) =>
          https.target === oldValue ? newHttps : https
        );
      }
      break;

    case 'SVCB':
      if (record.svcb && newRecord.svcb?.[0]) {
        const newSvcb = newRecord.svcb[0];
        // oldValue is the target
        updatedRecord.svcb = record.svcb.map((svcb: any) =>
          svcb.target === oldValue ? newSvcb : svcb
        );
      }
      break;

    case 'CNAME':
    case 'SOA':
      // Single-value types: replace entirely
      return { ...record, ...newRecord };

    default:
      // Fallback: replace entirely
      return { ...record, ...newRecord };
  }

  // Update TTL if provided in new record
  if (newRecord.ttl !== undefined) {
    if (newRecord.ttl === null) {
      delete updatedRecord.ttl; // Remove TTL to use default
    } else {
      updatedRecord.ttl = newRecord.ttl;
    }
  }

  return updatedRecord;
}

/**
 * Remove a specific value from a record's value array
 * Used for deleting individual values (e.g., one IP from A record with multiple IPs)
 */
export function removeValueFromRecord(record: any, recordType: string, valueToRemove: string): any {
  const updatedRecord = { ...record };

  switch (recordType) {
    case 'A':
      if (record.a?.content) {
        updatedRecord.a = {
          content: record.a.content.filter((ip: string) => ip !== valueToRemove),
        };
      }
      break;

    case 'AAAA':
      if (record.aaaa?.content) {
        updatedRecord.aaaa = {
          content: record.aaaa.content.filter((ip: string) => ip !== valueToRemove),
        };
      }
      break;

    case 'TXT':
      if (record.txt?.content) {
        updatedRecord.txt = {
          content: record.txt.content.filter((text: string) => text !== valueToRemove),
        };
      }
      break;

    case 'NS':
    case 'PTR':
      if (record.raw) {
        updatedRecord.raw = record.raw.filter((value: string) => value !== valueToRemove);
      }
      break;

    case 'MX':
      if (record.mx) {
        // valueToRemove format: "preference|exchange"
        updatedRecord.mx = record.mx.filter(
          (mx: any) => `${mx.preference}|${mx.exchange}` !== valueToRemove
        );
      }
      break;

    case 'SRV':
      if (record.srv) {
        // valueToRemove format: "priority weight port target"
        updatedRecord.srv = record.srv.filter(
          (srv: any) => `${srv.priority} ${srv.weight} ${srv.port} ${srv.target}` !== valueToRemove
        );
      }
      break;

    case 'CAA':
      if (record.caa) {
        // valueToRemove format: "flag tag "value""
        updatedRecord.caa = record.caa.filter(
          (caa: any) => `${caa.flag} ${caa.tag} "${caa.value}"` !== valueToRemove
        );
      }
      break;

    case 'TLSA':
      if (record.tlsa) {
        // valueToRemove format: "usage selector matchingType certData"
        updatedRecord.tlsa = record.tlsa.filter(
          (tlsa: any) =>
            `${tlsa.usage} ${tlsa.selector} ${tlsa.matchingType} ${tlsa.certData}` !== valueToRemove
        );
      }
      break;

    case 'HTTPS':
      if (record.https) {
        // valueToRemove format: "priority target [params]"
        updatedRecord.https = record.https.filter((https: any) => {
          const params = https.params
            ? ` ${Object.entries(https.params)
                .map(([k, v]) => `${k}=${v}`)
                .join(' ')}`
            : '';
          return `${https.priority} ${https.target}${params}` !== valueToRemove;
        });
      }
      break;

    case 'SVCB':
      if (record.svcb) {
        updatedRecord.svcb = record.svcb.filter((svcb: any) => {
          const params = svcb.params
            ? ` ${Object.entries(svcb.params)
                .map(([k, v]) => `${k}=${v}`)
                .join(' ')}`
            : '';
          return `${svcb.priority} ${svcb.target}${params}` !== valueToRemove;
        });
      }
      break;

    case 'CNAME':
      // CNAME is single-value, so removing it means setting content to undefined/null
      if (record.cname?.content === valueToRemove) {
        delete updatedRecord.cname;
      }
      break;

    case 'SOA':
      // SOA is single-value, so removing it means deleting the soa object
      if (record.soa && JSON.stringify(record.soa) === valueToRemove) {
        delete updatedRecord.soa;
      }
      break;
  }

  return updatedRecord;
}

/**
 * Check if a record has no more values left
 */
export function isRecordEmpty(record: any, recordType: string): boolean {
  switch (recordType) {
    case 'A':
      return !record.a?.content || record.a.content.length === 0;
    case 'AAAA':
      return !record.aaaa?.content || record.aaaa.content.length === 0;
    case 'CNAME':
      return !record.cname?.content;
    case 'TXT':
      return !record.txt?.content || record.txt.content.length === 0;
    case 'NS':
    case 'PTR':
      return !record.raw || record.raw.length === 0;
    case 'SOA':
      return !record.soa;
    case 'MX':
      return !record.mx || record.mx.length === 0;
    case 'SRV':
      return !record.srv || record.srv.length === 0;
    case 'CAA':
      return !record.caa || record.caa.length === 0;
    case 'TLSA':
      return !record.tlsa || record.tlsa.length === 0;
    case 'HTTPS':
      return !record.https || record.https.length === 0;
    case 'SVCB':
      return !record.svcb || record.svcb.length === 0;
    default:
      return true;
  }
}
