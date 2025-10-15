import { createRolesControl } from '@/resources/control-plane/iam/roles.control';
import { Client } from '@hey-api/client-axios';
import { AppLoadContext, LoaderFunctionArgs, data } from 'react-router';

export const ROUTE_PATH = '/api/roles' as const;

export const loader = async ({ context }: LoaderFunctionArgs) => {
  try {
    const { controlPlaneClient } = context as AppLoadContext;
    const rolesControl = createRolesControl(controlPlaneClient as Client);

    // Fetch fresh roles from control plane
    const roles = await rolesControl.list();

    return data({ success: true, data: roles }, { status: 200 });
  } catch (error: any) {
    return data(
      { success: false, error: error?.message ?? 'An unexpected error occurred' },
      { status: 500 }
    );
  }
};
