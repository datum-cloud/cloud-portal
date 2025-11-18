import { createDnsRecordSetsControl } from '@/resources/control-plane';
import { CreateDnsRecordSchema } from '@/resources/schemas/dns-record.schema';
import { redirectWithToast, validateCSRF } from '@/utils/cookies';
import { BadRequestError, HttpError } from '@/utils/errors';
import { extractValue, transformFormToRecord } from '@/utils/helpers/dns-record.helper';
import { Client } from '@hey-api/client-axios';
import { ActionFunctionArgs, AppLoadContext, data } from 'react-router';

export const ROUTE_PATH = '/api/dns-records' as const;

/**
 * DNS Records API Route
 * Handles create (POST) and delete (DELETE) operations
 *
 * Key Logic (New Schema):
 * - POST: Create new RecordSet OR append record to existing RecordSet
 * - DELETE: Remove record from RecordSet or delete entire RecordSet
 *
 * Note: With the new schema, each record contains exactly ONE value.
 * To have multiple values, create multiple record objects in the records[] array.
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

          const dryRunRes = await dnsRecordSetsControl.create(
            projectId,
            {
              dnsZoneRef: { name: dnsZoneId },
              recordType: recordType,
              records: [newRecord],
            },
            true
          );

          if (dryRunRes) {
            await dnsRecordSetsControl.create(
              projectId,
              {
                dnsZoneRef: { name: dnsZoneId },
                recordType: recordType,
                records: [newRecord],
              },
              false
            );
          }

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
          // APPEND: RecordSet exists → Add new record to records[] array
          // ===================================================================
          // With new schema: Each record = one value, so just append the new record
          const newRecord = transformFormToRecord(recordSchema);

          // Check for duplicate before appending
          const isDuplicate = existingRecordSet.records?.some((r: any) => {
            // Must match name
            if (r.name !== newRecord.name) return false;

            // Must match value
            const existingValue = extractValue(r, recordType);
            const newValue = extractValue(newRecord, recordType);
            if (existingValue !== newValue) return false;

            // Must match TTL (accounting for null/undefined as "auto")
            const existingTTL = r.ttl ?? null;
            const newTTL = newRecord.ttl ?? null;
            if (existingTTL !== newTTL) return false;

            return true; // Exact duplicate found
          });

          if (isDuplicate) {
            if (redirectUri) {
              return redirectWithToast(redirectUri as string, {
                title: `${recordType} record already exists`,
                description: 'The record already exists.',
                type: 'error',
              });
            }

            return data({
              success: false,
              error: 'The record already exists.',
            });
          }

          const updatedRecords = [...(existingRecordSet.records || []), newRecord];

          const dryRunRes = await dnsRecordSetsControl.update(
            projectId,
            existingRecordSet.name!,
            {
              records: updatedRecords,
            },
            true
          );

          if (dryRunRes) {
            await dnsRecordSetsControl.update(
              projectId,
              existingRecordSet.name!,
              {
                records: updatedRecords,
              },
              false
            );
          }

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
      // DELETE DNS RECORD
      // =======================================================================
      case 'DELETE': {
        const formData = Object.fromEntries(await request.formData());
        const { projectId, recordSetName, recordName, recordType, value, ttl, redirectUri } =
          formData;

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

        // ===================================================================
        // DELETE RECORD: Find and remove the matching record
        // ===================================================================
        // With new schema: Each record = one value, so deleting a value = deleting the record
        // Find the first matching record by name, value (if provided), and ttl (if provided)
        const recordIndex = recordSet.records!.findIndex((r: any) => {
          // Must match name
          if (r.name !== recordName) return false;

          // If value provided, must match value
          if (value) {
            const recordValue = extractValue(r, recordType as string);
            if (recordValue !== value) return false;
          }

          // If ttl provided, must match ttl
          if (ttl !== undefined) {
            const recordTTL = r.ttl ?? null;
            const targetTTL = ttl === '' || ttl === 'null' ? null : Number(ttl);
            if (recordTTL !== targetTTL) return false;
          }

          // This record matches all criteria
          return true;
        });

        if (recordIndex === -1) {
          throw new BadRequestError('Record not found');
        }

        // Remove only the first matching record
        const updatedRecords = recordSet.records!.filter((_, index) => index !== recordIndex);

        if (updatedRecords.length === 0) {
          // Last record → delete entire RecordSet
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
          // Update RecordSet without the deleted record
          const dryRunRes = await dnsRecordSetsControl.update(
            projectId as string,
            recordSetName as string,
            {
              records: updatedRecords,
            },
            true
          );

          if (dryRunRes) {
            await dnsRecordSetsControl.update(
              projectId as string,
              recordSetName as string,
              {
                records: updatedRecords,
              },
              false
            );
          }

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
