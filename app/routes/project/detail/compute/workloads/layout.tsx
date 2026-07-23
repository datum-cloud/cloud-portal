import {
  createServiceEntitlementService,
  type ServiceEntitlement,
} from '@/resources/service-entitlements';
import { ComputeNotEntitled } from '@/routes/project/detail/compute/compute-not-entitled';
import { toast } from '@datum-cloud/datum-ui/toast';
import { useEffect, useRef } from 'react';
import {
  data,
  Outlet,
  useLoaderData,
  useRevalidator,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from 'react-router';

type LoaderData = {
  entitlement: ServiceEntitlement | null;
};

export async function loader({ params }: LoaderFunctionArgs): Promise<LoaderData> {
  const projectId = params.projectId ?? '';
  const entitlement = await createServiceEntitlementService().getComputeEntitlement(projectId);
  return { entitlement };
}

export async function action({ request, params }: ActionFunctionArgs) {
  const url = new URL(request.url);
  if (url.searchParams.get('_action') !== 'request-compute') {
    return new Response(null, { status: 400 });
  }

  const projectId = params.projectId ?? '';
  await createServiceEntitlementService().create(projectId, 'compute');
  return data(null, { status: 201 });
}

export const handle = {
  breadcrumb: () => <span>Workloads</span>,
};

export default function WorkloadsLayout() {
  const { entitlement } = useLoaderData<LoaderData>();
  const { revalidate } = useRevalidator();

  const isPending = entitlement !== null && entitlement.phase !== 'Active';
  const wasPending = useRef(isPending);

  useEffect(() => {
    if (!isPending) return;
    const id = setInterval(revalidate, 5_000);
    return () => clearInterval(id);
  }, [isPending, revalidate]);

  useEffect(() => {
    if (wasPending.current && !isPending && entitlement !== null) {
      toast.success('Compute access approved — you can now deploy workloads.');
    }
    wasPending.current = isPending;
  }, [isPending, entitlement]);

  if (entitlement === null) {
    return <ComputeNotEntitled />;
  }

  if (isPending) {
    return <ComputeNotEntitled entitlementRequested />;
  }

  return <Outlet />;
}
