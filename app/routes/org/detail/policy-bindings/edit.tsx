import { PolicyBindingForm } from '@/features/policy-binding';
import {
  createPolicyBindingService,
  type PolicyBinding,
  useUpdatePolicyBinding,
} from '@/resources/policy-bindings';
import { paths } from '@/utils/config/paths.config';
import { BadRequestError, NotFoundError } from '@/utils/errors';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { toast } from '@datum-ui/components';
import {
  AppLoadContext,
  LoaderFunctionArgs,
  MetaFunction,
  data,
  useLoaderData,
  useParams,
  useNavigate,
} from 'react-router';

export const handle = {
  breadcrumb: () => <span>Edit</span>,
};

export const meta: MetaFunction<typeof loader> = mergeMeta(({ loaderData }) => {
  const policy = loaderData as PolicyBinding;
  return metaObject(policy?.name || 'Policy Binding');
});

export const loader = async ({ context, params }: LoaderFunctionArgs) => {
  const { orgId, policyBindingId } = params;
  const { controlPlaneClient, requestId } = context as AppLoadContext;

  if (!orgId || !policyBindingId) {
    throw new BadRequestError('Organization ID and policy binding ID are required');
  }

  const policyBindingService = createPolicyBindingService({ controlPlaneClient, requestId });

  const policyBinding = await policyBindingService.get(orgId, policyBindingId);

  if (!policyBinding) {
    throw new NotFoundError('Policy binding not found');
  }

  return data(policyBinding);
};

export default function OrgPolicyBindingEditPage() {
  const policyBinding = useLoaderData<typeof loader>();
  const { orgId, policyBindingId } = useParams();
  const navigate = useNavigate();

  const updatePolicyBinding = useUpdatePolicyBinding(orgId ?? '', policyBindingId ?? '', {
    onSuccess: () => {
      toast.success('Policy binding updated successfully', {
        description: 'You have successfully updated a policy binding.',
      });
      navigate(
        getPathWithParams(paths.org.detail.policyBindings.root, {
          orgId,
        })
      );
    },
    onError: (error) => {
      toast.error('Error', {
        description: error.message,
      });
    },
  });

  return (
    <div className="mx-auto w-full max-w-3xl py-8">
      <PolicyBindingForm
        defaultValue={policyBinding}
        onSubmit={(data) => updatePolicyBinding.mutate(data)}
        isPending={updatePolicyBinding.isPending}
      />
    </div>
  );
}
