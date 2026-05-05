import type { ServiceAccountDetailContext } from './layout';
import { BadgeCopy } from '@/components/badge/badge-copy';
import { useConfirmationDialog } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import { DangerCard } from '@/components/danger-card/danger-card';
import { DateTime } from '@/components/date-time';
import { List, type ListItem } from '@/components/list/list';
import { useDeleteServiceAccount, useUpdateServiceAccount } from '@/resources/service-accounts';
import { paths } from '@/utils/config/paths.config';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { Badge } from '@datum-cloud/datum-ui/badge';
import { Button } from '@datum-cloud/datum-ui/button';
import { Card, CardContent } from '@datum-cloud/datum-ui/card';
import { Col, Row } from '@datum-cloud/datum-ui/grid';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { PageTitle } from '@datum-cloud/datum-ui/page-title';
import { toast } from '@datum-cloud/datum-ui/toast';
import { InfoIcon, PowerIcon, PowerOffIcon, Trash2Icon } from 'lucide-react';
import { useMemo } from 'react';
import type { MetaFunction } from 'react-router';
import { useNavigate, useOutletContext, useParams } from 'react-router';

export const handle = {
  breadcrumb: () => <span>Overview</span>,
};

export const meta: MetaFunction = mergeMeta(() => metaObject('Overview'));

export default function ServiceAccountOverviewPage() {
  const { projectId, serviceAccountId } = useParams();
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
      // Re-enable the live data path so the user can see status + retry.
      setIsDeleting(false);
      toast.error('Error', { description: error.message });
    },
  });

  const toggleMutation = useUpdateServiceAccount(projectId ?? '', serviceAccountId ?? '', {
    onSuccess: () => {
      toast.success('Service account updated');
    },
    onError: (error) => {
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
      confirmValue: account.name,
      confirmInputLabel: `Type "${account.name}" to confirm.`,
      onSubmit: async () => {
        deleteMutation.mutate(account.name);
      },
    });
  };

  const handleToggle = () => {
    toggleMutation.mutate({
      status: account.status === 'Active' ? 'Disabled' : 'Active',
    });
  };

  const isActive = account.status === 'Active';

  const listItems: ListItem[] = useMemo(() => {
    return [
      { label: 'Name', content: account.name },
      { label: 'Display Name', content: account.displayName ?? '—' },
      {
        label: 'Identity Email',
        content: (
          <BadgeCopy
            value={account.identityEmail}
            text={account.identityEmail}
            className="text-foreground bg-muted border-none px-2"
          />
        ),
      },
      {
        label: 'Status',
        content: <Badge type={isActive ? 'success' : 'secondary'}>{account.status}</Badge>,
      },
      {
        label: 'Created',
        content: account.createdAt ? <DateTime date={account.createdAt} /> : '—',
      },
      {
        label: 'Last Modified',
        content: account.updatedAt ? <DateTime date={account.updatedAt} /> : '—',
      },
    ];
  }, [account, isActive]);

  return (
    <Row type="flex" gutter={[24, 32]}>
      <Col span={24}>
        <div className="flex items-center justify-between gap-4">
          <PageTitle title={account.displayName ?? account.name} />
          <div className="flex shrink-0 gap-2">
            <Button
              type="quaternary"
              theme="outline"
              size="small"
              loading={toggleMutation.isPending}
              onClick={handleToggle}>
              <Icon icon={isActive ? PowerOffIcon : PowerIcon} size={14} />
              {isActive ? 'Disable' : 'Enable'}
            </Button>
            <Button
              type="danger"
              theme="outline"
              size="small"
              loading={deleteMutation.isPending}
              onClick={handleDelete}>
              <Icon icon={Trash2Icon} size={14} />
              Delete
            </Button>
          </div>
        </div>
      </Col>

      <Col span={24}>
        <Card className="w-full overflow-hidden rounded-xl px-3 py-4 shadow-none sm:pt-6 sm:pb-4">
          <CardContent className="p-0 sm:px-6 sm:pb-4">
            <List items={listItems} />
          </CardContent>
        </Card>
      </Col>

      <Col span={24}>
        <div className="bg-muted/40 flex items-start gap-3 rounded-lg border p-4 text-sm">
          <Icon icon={InfoIcon} className="text-muted-foreground mt-0.5 size-4 shrink-0" />
          <p className="text-muted-foreground">
            Service accounts allow workloads, CI/CD pipelines, and automated systems to authenticate
            with Datum Cloud using short-lived tokens via{' '}
            <a
              href="https://datatracker.ietf.org/doc/html/rfc7523"
              target="_blank"
              rel="noopener noreferrer"
              className="underline">
              RFC 7523
            </a>{' '}
            JWT exchange.
          </p>
        </div>
      </Col>

      <Col span={24}>
        <h3 className="mb-4 text-base font-medium">Delete Service Account</h3>
        <DangerCard
          deleteText="Delete Service Account"
          loading={deleteMutation.isPending}
          onDelete={handleDelete}
          data-e2e="delete-service-account-button"
        />
      </Col>
    </Row>
  );
}
