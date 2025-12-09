import { createDomainsControl } from '@/resources/control-plane/networking/domains.control';
import { validateCSRF } from '@/utils/cookies';
import { BadRequestError, HttpError } from '@/utils/errors';
import { generateId } from '@/utils/helpers/text.helper';
import { Client } from '@hey-api/client-axios';
import { ActionFunctionArgs, AppLoadContext, data } from 'react-router';

export const ROUTE_PATH = '/api/domains/bulk-import' as const;

/**
 * Individual domain import detail
 */
export interface ImportDomainDetail {
  domain: string;
  resourceName?: string;
  action: 'created' | 'skipped' | 'failed';
  message?: string;
}

/**
 * Bulk import response
 */
export interface BulkImportResponse {
  success: boolean;
  summary: {
    total: number;
    created: number;
    skipped: number;
    failed: number;
  };
  details: ImportDomainDetail[];
}

/**
 * Domains Bulk Import API Route
 * Handles importing multiple domains at once
 *
 * Logic:
 * - Fetches existing domains to detect duplicates
 * - For each domain: create with auto-generated resource name or skip if duplicate
 * - Returns detailed summary with individual domain results
 */
export const action = async ({ request, context }: ActionFunctionArgs) => {
  const { controlPlaneClient } = context as AppLoadContext;

  try {
    if (request.method !== 'POST') {
      throw new HttpError('Method not allowed', 405);
    }

    const domainsControl = createDomainsControl(controlPlaneClient as Client);

    // Parse request body
    const formData = await request.json();

    const { projectId, domains, importOptions = {}, csrf } = formData;

    if (!projectId) {
      throw new BadRequestError('Project ID is required');
    }

    if (!domains || !Array.isArray(domains) || domains.length === 0) {
      throw new BadRequestError('Domains array is required');
    }

    // Validate CSRF token
    const csrfFormData = new FormData();
    csrfFormData.append('csrf', csrf);
    await validateCSRF(csrfFormData, request.headers);

    // Set default options
    const skipDuplicates = importOptions.skipDuplicates ?? true;

    // Initialize response summary
    const summary = {
      total: domains.length,
      created: 0,
      skipped: 0,
      failed: 0,
    };

    const details: ImportDomainDetail[] = [];

    // Fetch existing domains only if skipDuplicates is enabled
    const existingDomainNames = new Set<string>();
    if (skipDuplicates) {
      const existingDomains = await domainsControl.list(projectId);
      existingDomains.forEach((d) => {
        if (d.domainName) existingDomainNames.add(d.domainName.toLowerCase());
      });
    }

    // Process each domain
    for (const domain of domains) {
      const domainLower = domain.toLowerCase();

      // Check for duplicate
      if (skipDuplicates && existingDomainNames.has(domainLower)) {
        details.push({
          domain,
          action: 'skipped',
          message: 'Domain already exists',
        });
        summary.skipped++;
        continue;
      }

      // Generate resource name
      const resourceName = generateId(domain, { randomLength: 0 });

      const domainPayload = { name: resourceName, domainName: domainLower };

      try {
        await domainsControl.create(projectId, domainPayload, false);

        details.push({
          domain,
          resourceName,
          action: 'created',
          message: 'Created successfully',
        });
        summary.created++;

        // Add to existing set to prevent duplicates within the same batch
        existingDomainNames.add(domainLower);
      } catch (error: any) {
        details.push({
          domain,
          resourceName,
          action: 'failed',
          message: error.message || 'Unknown error',
        });
        summary.failed++;
      }
    }

    const hasErrors = summary.failed > 0;
    const response: BulkImportResponse = {
      success: !hasErrors,
      summary,
      details,
    };

    if (!hasErrors) {
      return data({ success: true, data: response }, { status: 200 });
    }

    // Partial success or all failed
    const successCount = summary.created + summary.skipped;
    return data(
      {
        success: successCount > 0,
        error: `${summary.failed} domain(s) failed to import`,
        data: response,
      },
      { status: successCount > 0 ? 207 : 400 } // 207 = Multi-Status for partial success
    );
  } catch (error: any) {
    return data(
      { success: false, error: error.message || 'An error occurred during bulk import' },
      { status: error.status || 500 }
    );
  }
};
