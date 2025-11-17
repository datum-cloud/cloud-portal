import { createDnsRecordSetsControl } from '@/resources/control-plane';
import { CreateDnsRecordSchema } from '@/resources/schemas/dns-record.schema';
import { redirectWithToast, validateCSRF } from '@/utils/cookies';
import { BadRequestError } from '@/utils/errors';
import {
  isRecordEmpty,
  mergeRecordValues,
  removeValueFromRecord,
  transformFormToRecord,
  updateValueInRecord,
} from '@/utils/helpers/dns-record.helper';
import { Client } from '@hey-api/client-axios';
import { ActionFunctionArgs, AppLoadContext, data, LoaderFunctionArgs } from 'react-router';

export const ROUTE_PATH = '/api/dns-records/:id' as const;

/**
 * DNS Record Detail API Route
 * Handles read (GET) and update (PATCH) operations for a specific RecordSet
 */

// =============================================================================
// GET: Fetch single RecordSet by ID
// =============================================================================
export const loader = async ({ params, context, request }: LoaderFunctionArgs) => {
  const { id } = params;

  if (!id) {
    throw new BadRequestError('RecordSet ID is required');
  }

  const url = new URL(request.url);
  const projectId = url.searchParams.get('projectId');

  if (!projectId) {
    throw new BadRequestError('Project ID is required');
  }

  const { controlPlaneClient } = context as AppLoadContext;
  const dnsRecordSetsControl = createDnsRecordSetsControl(controlPlaneClient as Client);

  const recordSet = await dnsRecordSetsControl.detail(projectId, id);

  return data(recordSet);
};

// =============================================================================
// PATCH: Update specific record within RecordSet
// =============================================================================
export const action = async ({ params, request, context }: ActionFunctionArgs) => {
  const { id } = params;
  const { controlPlaneClient } = context as AppLoadContext;

  if (!id) {
    throw new BadRequestError('RecordSet ID is required');
  }

  try {
    const dnsRecordSetsControl = createDnsRecordSetsControl(controlPlaneClient as Client);

    switch (request.method) {
      case 'PATCH': {
        const formData = await request.json();
        const { projectId, recordName, oldValue, oldTTL, redirectUri, csrf, ...recordData } =
          formData;

        if (!projectId || !recordName) {
          throw new BadRequestError('Project ID and Record Name are required');
        }

        // Create FormData to validate CSRF token
        const csrfFormData = new FormData();
        csrfFormData.append('csrf', csrf);

        // Validate the CSRF token against the request headers
        await validateCSRF(csrfFormData, request.headers);

        const recordSchema = recordData as CreateDnsRecordSchema;
        const recordType = recordSchema.recordType;
        const newTTL = recordSchema.ttl;

        // Get existing RecordSet
        const recordSet = await dnsRecordSetsControl.detail(projectId, id);

        // TODO: Need to confirm with backend team:
        // Should records with the same name but different TTLs be separate entries?
        // Currently checking both name AND ttl to find the correct record to update.
        // If backend confirms TTL should be ignored, change this to only check name.
        //
        // Find the record by name AND ttl (to support multiple records with same name)
        const recordIndex = recordSet.records?.findIndex((r: any) => {
          if (r.name !== recordName) return false;

          // For SOA records, TTL can be at record level OR inside soa object
          if (recordType === 'SOA') {
            const recordTTL = r.ttl ?? r.soa?.ttl ?? null;
            return recordTTL === (oldTTL ?? null);
          }

          // For other record types, compare TTL at record level
          // Compare TTL: undefined/null treated as equal (both "Auto")
          return (r.ttl ?? null) === (oldTTL ?? null);
        });

        if (recordIndex === undefined || recordIndex === -1) {
          throw new BadRequestError(
            `Record with name "${recordName}" and TTL "${oldTTL}" not found`
          );
        }

        const existingRecord = recordSet.records![recordIndex];

        // Transform form data to K8s record format
        const newRecordData = transformFormToRecord(recordSchema);

        // Check if TTL is changing
        const isTTLChanging = (newTTL ?? null) !== (oldTTL ?? null);

        let updatedRecords;

        if (isTTLChanging && oldValue) {
          // TTL is changing for a specific value → Move value to different record
          // 1. Remove the value from current record (with oldTTL)
          const updatedOldRecord = removeValueFromRecord(existingRecord, recordType, oldValue);

          // 2. Check if old record becomes empty after removing the value
          const isOldRecordEmpty = isRecordEmpty(updatedOldRecord, recordType);

          // 3. Find or prepare target record (with newTTL)
          const targetRecordIndex = recordSet.records?.findIndex(
            (r: any) =>
              r.name === recordName &&
              // Find record with the NEW TTL
              (r.ttl ?? null) === (newTTL ?? null)
          );

          if (
            targetRecordIndex !== undefined &&
            targetRecordIndex !== -1 &&
            targetRecordIndex !== recordIndex
          ) {
            // Target record exists → merge the new value into it
            const targetRecord = recordSet.records![targetRecordIndex];
            const mergedTargetRecord = mergeRecordValues(targetRecord, newRecordData, recordType);

            // Update records array
            updatedRecords = recordSet
              .records!.map((r: any, i: number) => {
                if (i === recordIndex) {
                  return isOldRecordEmpty ? null : updatedOldRecord; // Remove or update old record
                }
                if (i === targetRecordIndex) {
                  return mergedTargetRecord; // Merge into target record
                }
                return r;
              })
              .filter((r: any) => r !== null); // Remove empty records
          } else {
            // Target record doesn't exist → create new record with new TTL
            // Keep old record with remaining values, add new record with the updated value
            if (isOldRecordEmpty) {
              // Old record is now empty → replace it with new record
              updatedRecords = recordSet.records!.map((r: any, i: number) =>
                i === recordIndex ? newRecordData : r
              );
            } else {
              // Old record still has values → keep it and append new record
              updatedRecords = [
                ...recordSet.records!.map((r: any, i: number) =>
                  i === recordIndex ? updatedOldRecord : r
                ),
                newRecordData,
              ];
            }
          }
        } else {
          // TTL not changing OR no specific value → normal update
          const updatedRecord = oldValue
            ? updateValueInRecord(existingRecord, newRecordData, recordType, oldValue)
            : newRecordData;

          updatedRecords = recordSet.records!.map((r: any, i: number) =>
            i === recordIndex ? updatedRecord : r
          );
        }

        // Update RecordSet with PATCH
        await dnsRecordSetsControl.update(projectId, id, {
          records: updatedRecords,
        });

        if (redirectUri) {
          return redirectWithToast(redirectUri as string, {
            title: `${recordType} record updated`,
            description: `The ${recordType} record has been updated successfully`,
            type: 'success',
          });
        }

        return data(
          { success: true, message: `${recordType} record updated successfully` },
          { status: 200 }
        );
      }

      default:
        throw new BadRequestError('Method not allowed');
    }
  } catch (error: any) {
    console.error('DNS Record Update Error:', error);
    return data(
      { success: false, error: error.message || 'An error occurred' },
      { status: error.status || 500 }
    );
  }
};
