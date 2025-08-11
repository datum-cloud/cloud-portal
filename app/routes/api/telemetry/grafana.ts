import { validateCSRF } from '@/modules/cookie/csrf.server';
import { dataWithToast } from '@/modules/cookie/toast.server';
import { createExportPoliciesControl } from '@/resources/control-plane/export-policies.control';
import { createSecretsControl } from '@/resources/control-plane/secrets.control';
import {
  NewExportPolicySchema,
  newExportPolicySchema,
} from '@/resources/schemas/export-policy.schema';
import { SecretNewSchema, secretNewSchema } from '@/resources/schemas/secret.schema';
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

    console.log({ exportPolicyParsed: exportPolicyParsed.error });
    if (!exportPolicyParsed.success) {
      throw new Error('Invalid export policy');
    }

    // Validate secret
    const secretParsed = secretNewSchema.safeParse(payload.secret);

    if (!secretParsed.success) {
      throw new Error('Invalid secret');
    }

    // Create export policy
    const exportPolicyControl = createExportPoliciesControl(controlPlaneClient as Client);
    const exportPolicy = await exportPolicyControl.create(
      payload.projectId,
      exportPolicyParsed.data,
      false
    );

    // Create secret
    const secretControl = createSecretsControl(controlPlaneClient as Client);
    const secret = await secretControl.create(payload.projectId, secretParsed.data, true);

    return data({ success: true, data: { exportPolicy, secret } });
  } catch (error: any) {
    const message = error instanceof Error ? error.message : (error as Response).statusText;
    return dataWithToast(
      {
        success: false,
        error: message,
      },
      {
        title: 'Error',
        description: message,
        type: 'error',
      }
    );
  }
};
