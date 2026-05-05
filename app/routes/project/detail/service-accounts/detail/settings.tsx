import type { ServiceAccountDetailContext } from './layout';
import { useConfirmationDialog } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import { DangerCard } from '@/components/danger-card/danger-card';
import { DisplayNameFormCard } from '@/features/service-account';
import { useDeleteServiceAccount } from '@/resources/service-accounts';
import { paths } from '@/utils/config/paths.config';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { Col, Row } from '@datum-cloud/datum-ui/grid';
import { PageTitle } from '@datum-cloud/datum-ui/page-title';
import { toast } from '@datum-cloud/datum-ui/toast';
import type { MetaFunction } from 'react-router';
import { useNavigate, useOutletContext, useParams } from 'react-router';

export const handle = {
  breadcrumb: () => <span>Settings</span>,
};

export const meta: MetaFunction = mergeMeta(() => metaObject('Settings'));

export default function ServiceAccountSettingsPage() {
  const { projectId } = useParams();
  const { account, setIsDeleting } = useOutletContext<ServiceAccountDetailContext>();
  const { confirm } = useConfirmationDialog();
  const navigate = useNavigate();

  const deleteMutation = useDeleteServiceAccount(projectId ?? '', {
    onMutate: () => {
      // Quiet the live query + watch so they don't refetch a 404 between
      // mutation success and the navigate-away below.
      setIsDeleting(true);
    },
    onSuccess: (_, name) => {
      toast.success('Service account deleted');
      navigate(getPathWithParams(paths.project.detail.serviceAccounts.root, { projectId }), {
        state: { deletedName: name },
      });
    },
    onError: (error) => {
      setIsDeleting(false);
      toast.error('Error', { description: error.message });
    },
  });

  const handleDelete = async () => {
    await confirm({
      title: 'Delete Service Account',
      description: (
        <span>
          Are you sure you want to delete <strong>{account.name}</strong>? This will revoke all
          associated keys.
        </span>
      ),
      submitText: 'Delete',
      cancelText: 'Cancel',
      variant: 'destructive',
      showConfirmInput: true,
      onSubmit: async () => {
        deleteMutation.mutate(account.name);
      },
    });
  };

  return (
    <Row type="flex" gutter={[24, 24]}>
      <Col span={24}>
        <PageTitle title="Settings" />
      </Col>

      <Col span={24}>
        <h3 className="mb-4 text-base font-medium">Display Name</h3>
        <DisplayNameFormCard projectId={projectId ?? ''} defaultValue={account} />
      </Col>

      <Col span={24}>
        <h3 className="mb-4 text-base font-medium">Delete Service Account</h3>
        <DangerCard
          description={`This action cannot be undone. Once deleted, the ${account.name} service account and all associated keys will be permanently removed.`}
          deleteText="Delete Service Account"
          loading={deleteMutation.isPending}
          onDelete={handleDelete}
          data-e2e="delete-service-account-button"
        />
      </Col>
    </Row>
  );
}
