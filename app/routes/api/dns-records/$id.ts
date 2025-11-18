import { createDnsRecordSetsControl } from '@/resources/control-plane';
import { CreateDnsRecordSchema } from '@/resources/schemas/dns-record.schema';
import { redirectWithToast, validateCSRF } from '@/utils/cookies';
import { BadRequestError } from '@/utils/errors';
import { extractValue, transformFormToRecord } from '@/utils/helpers/dns-record.helper';
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

        // Get existing RecordSet
        const recordSet = await dnsRecordSetsControl.detail(projectId, id);

        // ===================================================================
        // UPDATE RECORD: Find and replace the matching record
        // ===================================================================
        // With new schema: Each record = one value, so updating a record = replacing it
        // Find the record by name, value (if provided), and ttl (if provided)
        const recordIndex = recordSet.records?.findIndex((r: any) => {
          // Must match name
          if (r.name !== recordName) return false;

          // If oldValue provided, must match value
          if (oldValue) {
            const recordValue = extractValue(r, recordType);
            if (recordValue !== oldValue) return false;
          }

          // If oldTTL provided, must match ttl
          if (oldTTL !== undefined) {
            const recordTTL = r.ttl ?? null;
            const targetTTL = oldTTL === '' || oldTTL === null ? null : oldTTL;
            if (recordTTL !== targetTTL) return false;
          }

          // This record matches all criteria
          return true;
        });

        if (recordIndex === undefined || recordIndex === -1) {
          throw new BadRequestError(
            `Record with name "${recordName}"${oldValue ? `, value "${oldValue}"` : ''}${oldTTL !== undefined ? `, and TTL "${oldTTL}"` : ''} not found`
          );
        }

        // Transform form data to K8s record format
        const newRecordData = transformFormToRecord(recordSchema);

        // Replace the matching record
        const updatedRecords = recordSet.records!.map((r: any, i: number) =>
          i === recordIndex ? newRecordData : r
        );

        // Update RecordSet with PATCH
        const dryRunRes = await dnsRecordSetsControl.update(
          projectId,
          id,
          {
            records: updatedRecords,
          },
          true
        );

        if (dryRunRes) {
          await dnsRecordSetsControl.update(
            projectId,
            id,
            {
              records: updatedRecords,
            },
            false
          );
        }

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
