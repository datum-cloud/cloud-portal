import { createExportPoliciesControl, createSecretsControl } from '@/resources/control-plane';
import { IExportPolicyControlResponse } from '@/resources/interfaces/export-policy.interface';
import { ISecretControlResponse } from '@/resources/interfaces/secret.interface';
import {
  NewExportPolicySchema,
  newExportPolicySchema,
} from '@/resources/schemas/export-policy.schema';
import { SecretNewSchema, secretNewSchema } from '@/resources/schemas/secret.schema';
import { redirectWithToast, validateCSRF } from '@/utils/cookies';
import { Client } from '@hey-api/client-axios';
import { ActionFunctionArgs, AppLoadContext, data } from 'react-router';

export const ROUTE_PATH = '/api/telemetry/grafana' as const;

export const action = async ({ request, context }: ActionFunctionArgs) => {
  const { controlPlaneClient } = context as AppLoadContext;
  const clonedRequest = request.clone();

  const payload: {
    projectId: string;
    csrf: string;
    exportPolicy: NewExportPolicySchema;
    secret: SecretNewSchema;
    redirectUri?: string;
  } = await clonedRequest.json();

  if (!payload.projectId) {
    throw new Error('Project ID is required');
  }

  try {
    // Extract CSRF token from JSON payload
    const csrfToken = payload.csrf;

    // Create FormData to validate CSRF token
    const formData = new FormData();
    formData.append('csrf', csrfToken);

    // Validate the CSRF token against the request headers
    await validateCSRF(formData, request.headers);

    // Validate export policy
    const exportPolicyParsed = newExportPolicySchema.safeParse(payload.exportPolicy);

    if (!exportPolicyParsed.success) {
      throw new Error('Invalid export policy');
    }

    // Validate secret
    const secretParsed = secretNewSchema.safeParse(payload.secret);

    if (!secretParsed.success) {
      throw new Error('Invalid secret');
    }

    // Create controls
    const secretControl = createSecretsControl(controlPlaneClient as Client);
    const exportPolicyControl = createExportPoliciesControl(controlPlaneClient as Client);

    // Dry run
    const secretDryRun = await secretControl.create(payload.projectId, secretParsed.data, true);
    const exportPolicyDryRun = await exportPolicyControl.create(
      payload.projectId,
      exportPolicyParsed.data,
      true
    );

    // Create
    if (secretDryRun && exportPolicyDryRun) {
      const secret = (await secretControl.create(
        payload.projectId,
        secretParsed.data,
        false
      )) as ISecretControlResponse;

      const exportPolicy = (await exportPolicyControl.create(
        payload.projectId,
        exportPolicyParsed.data,
        false
      )) as IExportPolicyControlResponse;

      if (payload.redirectUri) {
        return redirectWithToast(payload.redirectUri, {
          title: 'Export policy',
          description: 'The export policy has been created successfully',
          type: 'success',
        });
      }

      return data({ success: true, data: { exportPolicy, secret } }, { status: 200 });
    }

    return data({ success: false, error: 'Dry run failed' }, { status: 400 });
  } catch (error: any) {
    const message = error instanceof Error ? error.message : (error as Response).statusText;
    return data({ success: false, error: message }, { status: 400 });
  }
};
