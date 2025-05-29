import { routes } from '@/constants/routes';
import { redirectWithToast } from '@/modules/cookie/toast.server';
import { authMiddleware } from '@/modules/middleware/auth.middleware';
import { withMiddleware } from '@/modules/middleware/middleware';
import { createExportPoliciesControl } from '@/resources/control-plane/export-policies.control';
import { getPathWithParams } from '@/utils/path';
import { Client } from '@hey-api/client-axios';
import { ActionFunctionArgs, AppLoadContext } from 'react-router';

export const ROUTE_PATH = '/api/observe/actions' as const;

export const action = withMiddleware(async ({ request, context }: ActionFunctionArgs) => {
  const { controlPlaneClient } = context as AppLoadContext;
  const exportPoliciesControl = createExportPoliciesControl(controlPlaneClient as Client);

  switch (request.method) {
    case 'DELETE': {
      const formData = Object.fromEntries(await request.formData());
      const { exportPolicyId, projectId, orgId } = formData;
      await exportPoliciesControl.delete(projectId as string, exportPolicyId as string);

      return redirectWithToast(
        getPathWithParams(routes.projects.observe.exportPolicies.root, {
          orgId: orgId as string,
          projectId: projectId as string,
        }),
        {
          title: 'Export policy deleted successfully',
          description: 'The export policy has been deleted successfully',
          type: 'success',
        }
      );
    }
    default:
      throw new Error('Method not allowed');
  }
}, authMiddleware);
