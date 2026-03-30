import { GroupForm } from '@/features/organization/team/groups';
import { createRbacMiddleware } from '@/modules/rbac';
import { useCreateGroup, type CreateGroupInput } from '@/resources/groups';
import { buildOrganizationNamespace } from '@/utils/common';
import { paths } from '@/utils/config/paths.config';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { withMiddleware } from '@/utils/middlewares';
import { toast } from '@datum-ui/components';
import { useState } from 'react';
import { data, MetaFunction, useNavigate, useParams } from 'react-router';

export const handle = {
  breadcrumb: () => <span>Create Group</span>,
};

export const meta: MetaFunction = mergeMeta(() => {
  return metaObject('Create Group');
});

export const loader = withMiddleware(
  async () => {
    return data({});
  },
  createRbacMiddleware({
    resource: 'groups',
    verb: 'create',
    group: 'iam.miloapis.com',
    namespace: (params) => buildOrganizationNamespace(params.orgId),
  })
);

export default function CreateGroupPage() {
  const { orgId } = useParams();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createGroup = useCreateGroup(orgId ?? '');

  const handleSubmit = async (formData: CreateGroupInput) => {
    if (!orgId) return;
    setIsSubmitting(true);
    try {
      await createGroup.mutateAsync(formData);
      toast.success('Group created successfully');
      navigate(getPathWithParams(paths.org.detail.team.groups, { orgId }));
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to create group');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl py-8">
      <GroupForm onSubmit={handleSubmit} isSubmitting={isSubmitting} />
    </div>
  );
}
