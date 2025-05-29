import { authMiddleware } from '@/modules/middleware/auth.middleware';
import { withMiddleware } from '@/modules/middleware/middleware';
import { createExportPoliciesControl } from '@/resources/control-plane/export-policies.control';
import { CustomError } from '@/utils/errorHandle';
import { Client } from '@hey-api/client-axios';
import { AppLoadContext, data } from 'react-router';

export const ROUTE_PATH = '/api/observe/status' as const;

export const loader = withMiddleware(async ({ request, context }) => {
  try {
    const { controlPlaneClient } = context as AppLoadContext;
    const exportPoliciesControl = createExportPoliciesControl(controlPlaneClient as Client);

    const url = new URL(request.url);
    const projectId = url.searchParams.get('projectId');
    const exportPolicyId = url.searchParams.get('id');

    if (!projectId || !exportPolicyId) {
      throw new CustomError('Project ID and Export Policy ID are required', 400);
    }

    const status = await exportPoliciesControl.getStatus(projectId, exportPolicyId);
    return data(status);
  } catch (error) {
    return data(null);
  }
}, authMiddleware);
