import { BadgeStatus } from '@/components/badge/badge-status';
import { useConfirmationDialog } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import { DateTime } from '@/components/date-time';
import { DataTable } from '@/modules/datum-ui/components/data-table';
import { DataTableRowActionsProps } from '@/modules/datum-ui/components/data-table';
import { createHttpProxiesControl } from '@/resources/control-plane';
import { ControlPlaneStatus } from '@/resources/interfaces/control-plane.interface';
import { IHttpProxyControlResponse } from '@/resources/interfaces/http-proxy.interface';
import { ROUTE_PATH as HTTP_PROXIES_ACTIONS_PATH } from '@/routes/api/proxy';
import { paths } from '@/utils/config/paths.config';
import { BadRequestError } from '@/utils/errors';
import { transformControlPlaneStatus } from '@/utils/helpers/control-plane.helper';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { Button, toast } from '@datum-ui/components';
import { Client } from '@hey-api/client-axios';
import { ColumnDef } from '@tanstack/react-table';
import { ArrowRightIcon, PlusIcon } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import {
  AppLoadContext,
  Link,
  LoaderFunctionArgs,
  MetaFunction,
  useFetcher,
  useLoaderData,
  useNavigate,
  useParams,
} from 'react-router';

export const meta: MetaFunction = mergeMeta(() => {
  return metaObject('Proxy');
});

export const loader = async ({ context, params }: LoaderFunctionArgs) => {
  const { projectId } = params;
  const { controlPlaneClient } = context as AppLoadContext;
  const httpProxiesControl = createHttpProxiesControl(controlPlaneClient as Client);

  if (!projectId) {
    throw new BadRequestError('Project ID is required');
  }

  const httpProxies = await httpProxiesControl.list(projectId);
  return httpProxies;
};

export default function HttpProxyPage() {
  const { projectId } = useParams();
  const data = useLoaderData<typeof loader>();
  const fetcher = useFetcher({ key: 'delete-proxy' });
  const navigate = useNavigate();

  const { confirm } = useConfirmationDialog();

  const deleteHttpProxy = async (httpProxy: IHttpProxyControlResponse) => {
    await confirm({
      title: 'Delete Proxy',
      description: (
        <span>
          Are you sure you want to delete&nbsp;
          <strong>{httpProxy.name}</strong>?
        </span>
      ),
      submitText: 'Delete',
      cancelText: 'Cancel',
      variant: 'destructive',
      showConfirmInput: true,
      confirmValue: httpProxy.name,
      confirmInputLabel: `Type "${httpProxy.name}" to confirm.`,
      onSubmit: async () => {
        await fetcher.submit(
          {
            id: httpProxy?.name ?? '',
            projectId: projectId ?? '',
          },
          {
            method: 'DELETE',
            action: HTTP_PROXIES_ACTIONS_PATH,
          }
        );
      },
    });
  };

  const columns: ColumnDef<IHttpProxyControlResponse>[] = useMemo(
    () => [
      {
        header: 'Resource Name',
        accessorKey: 'name',
        cell: ({ row }) => {
          return <span className="font-medium">{row.original.name}</span>;
        },
      },
      {
        header: 'Endpoint',
        accessorKey: 'endpoint',
        cell: ({ row }) => {
          return row.original.endpoint;
        },
      },
      {
        header: 'Status',
        accessorKey: 'status',
        cell: ({ row }) => {
          return (
            row.original.status &&
            (() => {
              const transformedStatus = transformControlPlaneStatus(row.original.status);
              return (
                <BadgeStatus
                  status={transformedStatus}
                  label={
                    transformedStatus.status === ControlPlaneStatus.Success ? 'Active' : undefined
                  }
                />
              );
            })()
          );
        },
      },
      {
        header: 'Created At',
        accessorKey: 'createdAt',
        cell: ({ row }) => {
          return row.original.createdAt && <DateTime date={row.original.createdAt} />;
        },
      },
    ],
    [projectId]
  );

  const rowActions: DataTableRowActionsProps<IHttpProxyControlResponse>[] = useMemo(
    () => [
      {
        key: 'edit',
        label: 'Edit',
        action: (row) => {
          navigate(
            getPathWithParams(paths.project.detail.proxy.detail.edit, {
              projectId,
              proxyId: row.name,
            })
          );
        },
      },
      {
        key: 'delete',
        label: 'Delete',
        variant: 'destructive',
        action: (row) => deleteHttpProxy(row),
      },
    ],
    [projectId]
  );

  useEffect(() => {
    if (fetcher.data && fetcher.state === 'idle') {
      if (fetcher.data.success) {
        toast.success('Proxy deleted successfully', {
          description: 'The proxy has been deleted successfully',
        });
      } else {
        toast.error(fetcher.data.error);
      }
    }
  }, [fetcher.data, fetcher.state]);

  return (
    <DataTable
      columns={columns}
      data={data ?? []}
      onRowClick={(row) => {
        navigate(
          getPathWithParams(paths.project.detail.proxy.detail.overview, {
            projectId,
            proxyId: row.name,
          })
        );
      }}
      emptyContent={{
        title: "let's add a Proxy to get you started",
        actions: [
          {
            type: 'link',
            label: 'Add proxy',
            to: getPathWithParams(paths.project.detail.proxy.new, {
              projectId,
            }),
            variant: 'default',
            icon: <ArrowRightIcon className="size-4" />,
            iconPosition: 'end',
          },
        ],
      }}
      tableTitle={{
        title: 'Proxy',
        actions: (
          <Link
            to={getPathWithParams(paths.project.detail.proxy.new, {
              projectId,
            })}>
            <Button type="primary" theme="solid" size="small">
              <PlusIcon className="size-4" />
              Add proxy
            </Button>
          </Link>
        ),
      }}
      toolbar={{
        layout: 'compact',
        includeSearch: {
          placeholder: 'Search proxies',
        },
      }}
      rowActions={rowActions}
    />
  );
}
