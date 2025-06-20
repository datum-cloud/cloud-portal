import { DataTable } from '@/components/data-table/data-table';
import { Button } from '@/components/ui/button';
import { routes } from '@/constants/routes';
import { uiConfig } from '@/ui.config';
import { getPathWithParams } from '@/utils/path';
import { Client } from '@hey-api/client-axios';
import { createColumnHelper } from '@tanstack/react-table';
import { JSONPath } from 'jsonpath-plus';
import { PlusIcon } from 'lucide-react';
import {
  AppLoadContext,
  data,
  Link,
  LoaderFunctionArgs,
  useLoaderData,
  useParams,
} from 'react-router';

interface CustomResourceDefinition {
  spec: {
    group: string;
    names: {
      kind: string;
      plural: string;
    };
    versions: Array<{
      name: string;
      storage: boolean;
      additionalPrinterColumns?: Array<unknown>;
    }>;
  };
}

export const loader = async ({ context, params, request }: LoaderFunctionArgs) => {
  const { projectId, group, kind } = params;
  const { controlPlaneClient } = context as AppLoadContext;

  const { data: crds }: any = await (controlPlaneClient as Client).get({
    url: `/projects/${projectId}/control-plane/apis/apiextensions.k8s.io/v1/customresourcedefinitions`,
  });

  const crd = crds.items.find(
    (c: CustomResourceDefinition) =>
      c.spec.group === group && c.spec.names.kind.toLowerCase() === kind?.toLowerCase()
  );

  if (!crd) {
    throw new Response('CRD not found', { status: 404 });
  }

  const version = crd.spec.versions.find((v: { storage: boolean; name: string }) => v.storage).name;
  const plural = crd.spec.names.plural;
  const cols =
    crd.spec.versions.find(
      (v: { name: string; additionalPrinterColumns?: Array<unknown> }) => v.name === version
    )?.additionalPrinterColumns ?? [];

  const { data: resourceList }: any = await (controlPlaneClient as Client).get({
    url: `/projects/${projectId}/control-plane/apis/${group}/${version}/${plural}`,
  });

  const menu = uiConfig.find((m) => m.resource.group === group && m.resource.kind === kind);

  return data({
    crds,
    group,
    kind,
    columns: cols,
    items: resourceList.items,
    menu,
  });
};

export default function ResourceListPage() {
  const { menu, items, columns, crds } = useLoaderData<typeof loader>();
  const { orgId, projectId } = useParams();

  const crdsWithColumns = crds.items.filter((crd: CustomResourceDefinition) =>
    crd.spec.versions.some((version: any) => version.additionalPrinterColumns?.length > 0)
  );
  console.log('CRDs with additionalPrinterColumns:', crdsWithColumns);
  console.log('Columns:', columns);
  console.log('Items:', items);

  const columnHelper = createColumnHelper<any>();
  const tableColumns = columns.map((col: any) =>
    columnHelper.accessor(
      (row) => {
        const path = col.jsonPath.startsWith('$') ? col.jsonPath : `$${col.jsonPath}`;
        let val = JSONPath({ path, json: row })[0];
        if (col.type === 'date' && val) {
          val = new Date(val).toLocaleString();
        }
        return val ?? '-';
      },
      {
        id: col.name,
        header: col.name,
      }
    )
  );

  return (
    <DataTable
      columns={tableColumns}
      data={items ?? []}
      emptyContent={{
        title: `No ${menu?.menu.label} found.`,
        subtitle: `Create your first ${menu?.menu.label} to get started.`,
        actions: [
          {
            type: 'link',
            label: `New ${menu?.menu.label}`,
            to: getPathWithParams(routes.projects.resources.new, {
              orgId,
              projectId,
              group: menu?.resource.group,
              kind: menu?.resource.kind,
            }),
            variant: 'default',
            icon: <PlusIcon className="size-4" />,
          },
        ],
      }}
      tableTitle={{
        title: menu?.menu.label,
        description: `Manage your ${menu?.menu.label}`,
        actions: (
          <Link
            to={getPathWithParams(routes.projects.resources.new, {
              orgId,
              projectId,
              group: menu?.resource.group,
              kind: menu?.resource.kind,
            })}>
            <Button>
              <PlusIcon className="size-4" />
              New {menu?.menu.label}
            </Button>
          </Link>
        ),
      }}
    />
  );
}
