import { createDnsRecordSetsControl } from '@/resources/control-plane';
import { CreateDnsRecordSchema } from '@/resources/schemas/dns-record.schema';
import { redirectWithToast, validateCSRF } from '@/utils/cookies';
import { BadRequestError, HttpError } from '@/utils/errors';
import {
  isRecordEmpty,
  mergeRecordValues,
  removeValueFromRecord,
  transformFormToRecord,
} from '@/utils/helpers/dns-record.helper';
import { Client } from '@hey-api/client-axios';
import { ActionFunctionArgs, AppLoadContext, data } from 'react-router';

export const ROUTE_PATH = '/api/dns-records' as const;

/**
 * DNS Records API Route
 * Handles create (POST) and delete (DELETE) operations
 *
 * Key Logic:
 * - POST: Create new RecordSet OR append to existing RecordSet
 * - DELETE: Remove value from record, remove record, or delete entire RecordSet
 */
export const action = async ({ request, context }: ActionFunctionArgs) => {
  const { controlPlaneClient } = context as AppLoadContext;

  try {
    const dnsRecordSetsControl = createDnsRecordSetsControl(controlPlaneClient as Client);

    switch (request.method) {
      // =======================================================================
      // CREATE OR APPEND DNS RECORD
      // =======================================================================
      case 'POST': {
        const formData = await request.json();
        const { projectId, dnsZoneId, redirectUri, csrf, ...recordData } = formData;

        if (!projectId || !dnsZoneId) {
          throw new BadRequestError('Project ID and DNS Zone ID are required');
        }

        // Create FormData to validate CSRF token
        const csrfFormData = new FormData();
        csrfFormData.append('csrf', csrf);

        // Validate the CSRF token against the request headers
        await validateCSRF(csrfFormData, request.headers);

        const recordSchema = recordData as CreateDnsRecordSchema;
        const recordType = recordSchema.recordType;

        // Check if RecordSet exists for this type + zone
        const existingRecordSet = await dnsRecordSetsControl.findByTypeAndZone(
          projectId,
          dnsZoneId,
          recordType
        );

        if (!existingRecordSet) {
          // ===================================================================
          // CREATE: No RecordSet exists for this type → Create new RecordSet
          // ===================================================================
          const newRecord = transformFormToRecord(recordSchema);

          await dnsRecordSetsControl.create(projectId, {
            dnsZoneRef: { name: dnsZoneId },
            recordType: recordType,
            records: [newRecord],
          });

          if (redirectUri) {
            return redirectWithToast(redirectUri as string, {
              title: `${recordType} record created`,
              description: `The ${recordType} record has been created successfully`,
              type: 'success',
            });
          }

          return data(
            { success: true, message: `${recordType} record created successfully` },
            { status: 201 }
          );
        } else {
          // ===================================================================
          // APPEND: RecordSet exists → Add to records[] array
          // ===================================================================
          const newRecord = transformFormToRecord(recordSchema);
          const recordName = recordSchema.name || '@';

          // TODO: Need to confirm with backend team:
          // Should records with the same name but different TTLs be separate entries?
          // Currently checking both name AND ttl to determine if it's the same record.
          // If backend confirms TTL should be ignored, change this to only check name.
          //
          // Current behavior: Different TTLs = separate records
          // Alternative behavior: Same name = merge regardless of TTL
          const existingRecord = existingRecordSet.records?.find((r: any) => {
            if (r.name !== recordName) return false;

            // For SOA records, TTL can be at record level OR inside soa object
            if (recordType === 'SOA') {
              const recordTTL = r.ttl ?? r.soa?.ttl ?? null;
              const newRecordTTL = newRecord.ttl ?? newRecord.soa?.ttl ?? null;
              return recordTTL === newRecordTTL;
            }

            // For other record types, compare TTL at record level
            // Compare TTL: undefined/null treated as equal (both "Auto")
            return (r.ttl ?? null) === (newRecord.ttl ?? null);
          });

          let updatedRecords;
          if (existingRecord) {
            // Record with same name AND ttl exists → merge values (append to content arrays)
            updatedRecords = existingRecordSet.records?.map((r: any) => {
              if (r.name !== recordName) return r;

              // For SOA records, check TTL in both locations
              if (recordType === 'SOA') {
                const recordTTL = r.ttl ?? r.soa?.ttl ?? null;
                const newRecordTTL = newRecord.ttl ?? newRecord.soa?.ttl ?? null;
                return recordTTL === newRecordTTL ? mergeRecordValues(r, newRecord, recordType) : r;
              }

              // For other record types, compare TTL at record level
              return (r.ttl ?? null) === (newRecord.ttl ?? null)
                ? mergeRecordValues(r, newRecord, recordType)
                : r;
            });
          } else {
            // New record (different name OR different ttl) → append to array
            updatedRecords = [...(existingRecordSet.records || []), newRecord];
          }

          await dnsRecordSetsControl.update(projectId, existingRecordSet.name!, {
            records: updatedRecords,
          });

          if (redirectUri) {
            return redirectWithToast(redirectUri as string, {
              title: `${recordType} record added`,
              description: `The ${recordType} record has been added successfully`,
              type: 'success',
            });
          }

          return data(
            { success: true, message: `${recordType} record added successfully` },
            { status: 200 }
          );
        }
      }

      // =======================================================================
      // DELETE DNS RECORD OR VALUE
      // =======================================================================
      case 'DELETE': {
        const formData = Object.fromEntries(await request.formData());
        const { projectId, recordSetName, recordName, recordType, value, redirectUri } = formData;

        if (!projectId || !recordSetName || !recordName || !recordType) {
          throw new BadRequestError(
            'Project ID, RecordSet Name, Record Name, and Record Type are required'
          );
        }

        // Get the RecordSet
        const recordSet = await dnsRecordSetsControl.detail(
          projectId as string,
          recordSetName as string
        );

        // Find the record by name
        const recordIndex = recordSet.records?.findIndex((r: any) => r.name === recordName);

        if (recordIndex === undefined || recordIndex === -1) {
          throw new BadRequestError(`Record with name "${recordName}" not found`);
        }

        const record = recordSet.records![recordIndex];

        if (value) {
          // ===================================================================
          // DELETE SPECIFIC VALUE: Remove from value array
          // ===================================================================
          const updatedRecord = removeValueFromRecord(
            record,
            recordType as string,
            value as string
          );

          if (isRecordEmpty(updatedRecord, recordType as string)) {
            // Last value removed → delete entire record
            const updatedRecords = recordSet.records!.filter(
              (_: any, i: number) => i !== recordIndex
            );

            if (updatedRecords.length === 0) {
              // Last record → delete RecordSet
              await dnsRecordSetsControl.delete(projectId as string, recordSetName as string);

              if (redirectUri) {
                return redirectWithToast(redirectUri as string, {
                  title: 'DNS record deleted',
                  description: 'The last record has been removed and RecordSet deleted',
                  type: 'success',
                });
              }

              return data(
                { success: true, message: 'RecordSet deleted successfully' },
                { status: 200 }
              );
            } else {
              // Update RecordSet without this record
              await dnsRecordSetsControl.update(projectId as string, recordSetName as string, {
                records: updatedRecords,
              });

              if (redirectUri) {
                return redirectWithToast(redirectUri as string, {
                  title: 'DNS record deleted',
                  description: 'The record has been deleted successfully',
                  type: 'success',
                });
              }

              return data(
                { success: true, message: 'Record deleted successfully' },
                { status: 200 }
              );
            }
          } else {
            // Update record with remaining values
            const updatedRecords = recordSet.records!.map((r: any, i: number) =>
              i === recordIndex ? updatedRecord : r
            );

            await dnsRecordSetsControl.update(projectId as string, recordSetName as string, {
              records: updatedRecords,
            });

            if (redirectUri) {
              return redirectWithToast(redirectUri as string, {
                title: 'DNS record value deleted',
                description: 'The record value has been deleted successfully',
                type: 'success',
              });
            }

            return data(
              { success: true, message: 'Record value deleted successfully' },
              { status: 200 }
            );
          }
        } else {
          // ===================================================================
          // DELETE ENTIRE RECORD: Remove from records[] array
          // ===================================================================
          const updatedRecords = recordSet.records!.filter(
            (_: any, i: number) => i !== recordIndex
          );

          if (updatedRecords.length === 0) {
            // Last record → delete RecordSet
            await dnsRecordSetsControl.delete(projectId as string, recordSetName as string);

            if (redirectUri) {
              return redirectWithToast(redirectUri as string, {
                title: 'DNS record deleted',
                description: 'The last record has been removed and RecordSet deleted',
                type: 'success',
              });
            }

            return data(
              { success: true, message: 'RecordSet deleted successfully' },
              { status: 200 }
            );
          } else {
            // Update RecordSet without this record
            await dnsRecordSetsControl.update(projectId as string, recordSetName as string, {
              records: updatedRecords,
            });

            if (redirectUri) {
              return redirectWithToast(redirectUri as string, {
                title: 'DNS record deleted',
                description: 'The record has been deleted successfully',
                type: 'success',
              });
            }

            return data({ success: true, message: 'Record deleted successfully' }, { status: 200 });
          }
        }
      }

      default:
        throw new HttpError('Method not allowed', 405);
    }
  } catch (error: any) {
    console.error('DNS Records API Error:', error);
    return data(
      { success: false, error: error.message || 'An error occurred' },
      { status: error.status || 500 }
    );
  }
};
