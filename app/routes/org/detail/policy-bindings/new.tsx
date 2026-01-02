import { PolicyBindingForm } from '@/features/policy-binding';
import { useCreatePolicyBinding } from '@/resources/policy-bindings';
import { paths } from '@/utils/config/paths.config';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { toast } from '@datum-ui/components';
import { MetaFunction, useParams, useNavigate } from 'react-router';

export const meta: MetaFunction = mergeMeta(() => {
  return metaObject('New Policy Binding');
});

export default function OrgPolicyBindingsNewPage() {
  const { orgId } = useParams();
  const navigate = useNavigate();

  const createPolicyBinding = useCreatePolicyBinding(orgId ?? '', {
    onSuccess: () => {
      toast.success('Policy binding created successfully', {
        description: 'You have successfully created a policy binding.',
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
        onSubmit={(data) => createPolicyBinding.mutate(data)}
        isPending={createPolicyBinding.isPending}
      />
    </div>
  );
}
